from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.dependencies.db import get_db
from app.dependencies.auth import me
from app.dependencies.client import supabase
from app.schemas.user import User, InstructorActivate, ProfileRole
from uuid import UUID
from typing import List, Optional, Annotated, Dict
from datetime import datetime, timezone
from app.services.course_service import CourseService
from app.services.user_service import UserService
from app.services.enroll_service import EnrollService
from app.services.thread_service import ThreadService
from app.services.insights_service import InsightsService
from app.services.ai_events_service import AIEventsService
from app.services.chat_service import ChatService
from app.services.insights_student_service import InsightsStudentService
from app.services.announcement_service import AnnouncementService
from app.schemas.course import NewCourse, PatchCourse, CourseFileRequest, CourseFile
from app.schemas.insights import InsightsStatus, TagStatistics, UpdateTagsRequest, UpdateThreadTagRequest
from app.schemas.announcement import AnnouncementRequest, AnnouncementUpdate
from app.schemas.rules import CourseRulesRequest, CourseRulesResponse, ResetRulesRequest, RuleObject
from app.services.rules_service import RulesService
from app.services.topics_service import TopicsService
from app.schemas.thread import ThreadType
from app.schemas.topics import (
    TopicsListResponse,
    CreateTopicRequest,
    UpdateTopicRequest,
    DeleteTopicRequest,
    GenerateFromSyllabusRequest,
    GenerateFromSyllabusResponse,
    ReclassifyThreadsResponse,
)
from openai import OpenAI




router = APIRouter(tags=["instructor"])
client = OpenAI()

@router.get(path="/courses")
async def get_instructor_courses(db = Depends(get_db), user: User = Depends(me)):

    return await CourseService.get_instructor_courses(db, user["id"])


@router.post(path="/courses")
async def create_course(body: NewCourse, db = Depends(get_db), user: User = Depends(me)):
    
    id = await CourseService.new_course(db, body, user["id"])
    await EnrollService.enroll_student(db, user["id"], id)
    return id

@router.patch(path="/courses")
async def patch_course(body: PatchCourse, db = Depends(get_db), user: User = Depends(me)):

    # Verify instructor owns the course
    if not await UserService.verify_instructor_course(db, body.id, user["id"]):
        raise HTTPException(401, "Not authorized to view this course")

    return await CourseService.update_course(db, body, user["id"])

@router.get(path="/courses/{course_id}/enrollment")
async def get_enrolled_students(course_id: UUID, db = Depends(get_db), user: User = Depends(me)):
    
    # Verify instructor owns the course
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to view this course")
    
    return await CourseService.get_enrollment(db, course_id)

@router.get(path="/courses/{course_id}/enrollment/preview")
async def get_enrolled_students(course_id: UUID, db = Depends(get_db), user: User = Depends(me)):
    
    # Verify instructor owns the course
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to view this course")
    
    return await CourseService.get_enrollment_preview(db, course_id)

@router.post(path="/courses/{course_id}/files")
async def upload_files(course_id: UUID, files: Annotated[List[UploadFile], File(...)], db = Depends(get_db), user: User = Depends(me)):

    verified = await UserService.verify_instructor_course(db, course_id, user["id"])

    if not verified:
        raise HTTPException(401, "not authorized to view course")
        
    # check if vector store exists, otherwise create
    vector_store_id = await CourseService.get_vector_store(db, course_id)

    if not vector_store_id:
        course_code = await CourseService.get_course_code(db, course_id)
        vector_store = client.vector_stores.create(name=f"{course_code} – {course_id}") 
        vector_store_id = vector_store.id
        # MAKE SURE TO ADD VECTOR STORE ID TO DB
        await CourseService.add_vector_store(db, course_id, vector_store_id)

    res: List[UUID] = []

    for file in files:


        # Check that file is pdf, docx, or pptx
        ALLOWED_TYPES = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/markdown",
            "text/plain",
            "text/csv",
            "text/html",
            "text/xml",
            "text/css",
            "text/javascript",
            "text/json",
            "text/yaml",
            "text/toml",
            "text/yaml",
            "application/json",
            "text/x-python-script",
            "text/x-python",
            "text/x-java",
            "text/x-c",
            "text/x-c++",
            "text/x-php",
            "text/x-ruby",
            "text/x-perl",
        ]
        if file.content_type not in ALLOWED_TYPES:
            print(file.content_type)
            raise HTTPException(400, "Invalid file type. Only PDF, DOCX, and PPTX allowed.")

        # read file into memory 
        file_content = await file.read()

        # send file to supabase storage
        filepath = f"{course_id}/{file.filename}"
        try:
            supabase.storage.from_("course_files").upload(
                path=filepath,
                file=file_content,
                file_options={"content-type": file.content_type}
            )
        except Exception as e:
            raise HTTPException(500, f"file upload failed: {e}")
            
        # send file to openai vector store
        try:
            file_res = client.files.create(
                file=(file.filename, file_content),
                purpose="user_data"
            )

            file_id = file_res.id

            client.vector_stores.files.create(
                vector_store_id=vector_store_id,
                file_id=file_id
            )

            saved_file: CourseFileRequest = CourseFileRequest(
                course_id = course_id,
                name = file.filename,
                supabase_path=filepath,
                openai_file_id=file_id,
                size=file_res.bytes,
                mime_type=file.content_type
            )

            new_id = await CourseService.add_coursefile(db, saved_file)
            res.append(new_id)

        except Exception as e:
            
            # remove file from supabase if not uploaded to openai
            supabase.storage.from_("course_files").remove([filepath])
            raise HTTPException(500, f"OpenAI Upload Failed: {str(e)}")
        
    return res

@router.get(path="/courses/{course_id}/files")
async def get_files(course_id: UUID, db = Depends(get_db), user = Depends(me)):

    if await UserService.verify_instructor_course(db, course_id, user["id"]):

        return await CourseService.get_course_files(db, course_id)
    
    else:
        raise HTTPException(401, detail="Not authorized to ciew this course")
        
@router.get(path="/files/{file_id}/url")
async def get_file_url_by_id(file_id: UUID, db = Depends(get_db), user = Depends(me)):
    
    file: CourseFile = await CourseService.get_course_file(db, file_id)
    
    if not file:
        raise HTTPException(404, detail="File not found")
    
    # Verify user is instructor for this file's course
    if not await UserService.verify_instructor_course(db, file.course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this file")
    
    try:
        # Create signed URL valid for 1 hour (3600 seconds)
        response = supabase.storage.from_("course_files").create_signed_url(
            path=file.supabase_filepath,
            expires_in=3600
        )                
        # Handle both dict-like and attribute access for signed_url
        signed_url = response["signedURL"]
        
        return {
            "url": signed_url,
            "file": {
                "id": str(file.id),
                "name": file.name,
                "mime_type": file.mime_type,
                "size": file.size,
                "course_id": str(file.course_id)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to create signed URL: {str(e)}")

@router.get(path="/courses/{course_id}/files/{file_id}/url")
async def get_file_url(course_id: UUID, file_id: UUID, db = Depends(get_db), user = Depends(me)):

    
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    file: CourseFile = await CourseService.get_course_file(db, file_id)
    
    if file.course_id != course_id:
        raise HTTPException(404, detail="File not found")
    
    try:
        # Create signed URL valid for 1 hour (3600 seconds)
        response = supabase.storage.from_("course_files").create_signed_url(
            path=file.supabase_filepath,
            expires_in=3600
        )                
        # Handle both dict-like and attribute access for signed_url
        signed_url = response["signedURL"]
        
        return {"url": signed_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to create signed URL: {str(e)}")

@router.delete(path="/courses/{course_id}/files/{file_id}")
async def delete_file(course_id: UUID, file_id: UUID, db = Depends(get_db), user = Depends(me)):


    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to ciew this course")


    file: CourseFile = await CourseService.get_course_file(db, file_id)

    try:
        client.files.delete(file.openai_file_id)
    except:
        print("couldn't remove from openai")
    
    try:
        supabase.storage.from_("course_files").remove(file.supabase_filepath)
    except:
        print("couldn't remove file from supabase storage")

    await CourseService.delete_course_file(db, file_id)

@router.get(path="/courses/{course_id}/insights/status")
async def get_insights_status(course_id: UUID, db = Depends(get_db), user: User = Depends(me)):
    """Get insights status including thread count and unlock status."""
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    total_threads = await ThreadService.get_total_thread_count_by_course(db, course_id)
    thread_tags = await CourseService.get_thread_tags(db, course_id)
    is_unlocked = thread_tags is not None
    
    return InsightsStatus(
        total_threads=total_threads,
        is_unlocked=is_unlocked,
        thread_tags=thread_tags
    )

@router.post(path="/courses/{course_id}/insights/unlock")
async def unlock_insights(course_id: UUID, db = Depends(get_db), user: User = Depends(me)):
    """Unlock insights by generating tags and classifying threads."""
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    # Verify thread count >= 20
    total_threads = await ThreadService.get_total_thread_count_by_course(db, course_id)
    if total_threads < 20:
        raise HTTPException(400, detail="At least 20 threads are required to unlock insights")
    
    # Check if already unlocked
    existing_tags = await CourseService.get_thread_tags(db, course_id)
    if existing_tags:
        raise HTTPException(400, detail="Insights are already unlocked for this course")
    
    try:
        user_id = UUID(user["id"])
        # Generate tags
        tags = await InsightsService.generate_thread_tags(db, course_id, user_id=user_id)
        
        # Classify threads
        classification_result = await InsightsService.classify_threads(db, course_id, tags, user_id=user_id)
        
        # Save tags to course
        await CourseService.set_thread_tags(db, course_id, tags)
        
        return {
            "tags": tags,
            "classification": classification_result
        }
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to unlock insights: {str(e)}")

@router.get(path="/courses/{course_id}/insights/tags")
async def get_tag_statistics(course_id: UUID, limit: Optional[int] = None, db = Depends(get_db), user: User = Depends(me)):
    """Get tag statistics sorted by count (descending)."""
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    thread_tags = await CourseService.get_thread_tags(db, course_id)
    if not thread_tags:
        return []
    
    # Get all threads for the course
    all_threads = await ThreadService.get_all_threads_by_course(db, course_id)
    total_threads = len(all_threads)
    
    if total_threads == 0:
        return []
    
    # Count threads per tag
    tag_counts: Dict[str, int] = {tag: 0 for tag in thread_tags}
    for thread in all_threads:
        thread_tag = thread.get("thread_tag")
        if thread_tag and thread_tag in tag_counts:
            tag_counts[thread_tag] += 1
    
    # Create statistics
    statistics = [
        TagStatistics(
            tag=tag,
            count=count,
            percentage=round((count / total_threads) * 100, 2) if total_threads > 0 else 0.0
        )
        for tag, count in tag_counts.items()
    ]
    
    # Sort by count descending
    statistics.sort(key=lambda x: x.count, reverse=True)
    
    # Apply limit if provided
    if limit and limit > 0:
        statistics = statistics[:limit]
    
    return statistics

@router.get(path="/courses/{course_id}/insights/threads")
async def get_threads_by_tag(course_id: UUID, tag: Optional[str] = None, db = Depends(get_db), user: User = Depends(me)):
    """Get threads grouped by tag, or filtered by specific tag."""
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    if tag:
        # Return threads for specific tag
        threads = await ThreadService.get_threads_by_tag(db, course_id, tag)
        return {"tag": tag, "threads": threads}
    else:
        # Return all threads grouped by tag
        thread_tags = await CourseService.get_thread_tags(db, course_id)
        if not thread_tags:
            return {}
        
        result = {}
        for tag in thread_tags:
            threads = await ThreadService.get_threads_by_tag(db, course_id, tag)
            result[tag] = threads
        
        return result

@router.patch(path="/courses/{course_id}/insights/tags")
async def update_tags(course_id: UUID, body: UpdateTagsRequest, db = Depends(get_db), user: User = Depends(me)):
    """Update the thread_tags array for a course. Optionally reclassify all threads."""
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    if len(body.tags) != 10:
        raise HTTPException(400, detail="Must provide exactly 10 tags")
    
    # Update the tags in the course
    await CourseService.set_thread_tags(db, course_id, body.tags)
    
    result = {"tags": body.tags}
    
    # Reclassify all threads with the new tags if requested
    if body.reclassify:
        try:
            user_id = UUID(user["id"])
            classification_result = await InsightsService.classify_threads(db, course_id, body.tags, user_id=user_id)
            result["classification"] = classification_result
        except Exception as e:
            raise HTTPException(500, detail=f"Tags updated but reclassification failed: {str(e)}")
    
    return result

@router.patch(path="/courses/{course_id}/insights/threads/{thread_id}/tag")
async def update_thread_tag(
    course_id: UUID, 
    thread_id: UUID, 
    body: UpdateThreadTagRequest, 
    db = Depends(get_db), 
    user: User = Depends(me)
):
    """Update a single thread's tag."""
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    # Verify thread belongs to course
    all_threads = await ThreadService.get_all_threads_by_course(db, course_id)
    thread_ids = [t["id"] for t in all_threads]
    if thread_id not in thread_ids:
        raise HTTPException(404, detail="Thread not found in this course")
    
    # Verify tag is valid
    thread_tags = await CourseService.get_thread_tags(db, course_id)
    if not thread_tags:
        raise HTTPException(400, detail="Insights not unlocked for this course")
    
    if body.tag not in thread_tags:
        raise HTTPException(400, detail=f"Tag '{body.tag}' is not a valid tag for this course")
    
    await ThreadService.update_thread_tag(db, thread_id, body.tag)
    return {"thread_id": str(thread_id), "tag": body.tag}

# Topics Management Endpoints

@router.get(path="/courses/{course_id}/topics", response_model=TopicsListResponse)
async def get_topics(course_id: UUID, db = Depends(get_db), user: User = Depends(me)):
    """Get all topics for a course."""
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    topics = await TopicsService.get_topics(db, course_id)
    return {"topics": topics}

@router.post(path="/courses/{course_id}/topics", response_model=TopicsListResponse)
async def create_topic(
    course_id: UUID,
    body: CreateTopicRequest,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Create a new topic for a course."""
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    try:
        topics = await TopicsService.create_topic(db, course_id, body.name)
        return {"topics": topics}
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to create topic: {str(e)}")

@router.put(path="/courses/{course_id}/topics", response_model=TopicsListResponse)
async def update_topic(
    course_id: UUID,
    body: UpdateTopicRequest,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Update a topic name (renames the topic and updates all thread references)."""
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    try:
        topics = await TopicsService.update_topic(db, course_id, body.old_name, body.new_name)
        return {"topics": topics}
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to update topic: {str(e)}")

@router.delete(path="/courses/{course_id}/topics", response_model=TopicsListResponse)
async def delete_topic(
    course_id: UUID,
    body: DeleteTopicRequest,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Delete a topic (orphaned threads will have thread_tag set to NULL)."""
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    try:
        topics = await TopicsService.delete_topic(db, course_id, body.name)
        return {"topics": topics}
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to delete topic: {str(e)}")

@router.post(path="/courses/{course_id}/topics/generate-from-syllabus", response_model=GenerateFromSyllabusResponse)
async def generate_topics_from_syllabus(
    course_id: UUID,
    body: GenerateFromSyllabusRequest,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Generate topic suggestions from a syllabus file."""
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    # Verify file belongs to course
    try:
        file_obj = await CourseService.get_course_file(db, body.file_id)
        if file_obj.course_id != course_id:
            raise HTTPException(404, detail="File not found in this course")
    except Exception as e:
        raise HTTPException(404, detail="File not found")
    
    # Get course info
    course_name = await CourseService.get_course_name_by_id(db, course_id)
    course_code = await CourseService.get_course_code(db, course_id)
    
    try:
        user_id = UUID(user["id"])
        suggested_topics = await TopicsService.generate_topics_from_syllabus(
            db=db,
            file_id=body.file_id,
            course_id=course_id,
            course_name=course_name,
            course_code=course_code,
            user_id=user_id,
        )
        return {"suggested_topics": suggested_topics}
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to generate topics from syllabus: {str(e)}")

@router.post(path="/courses/{course_id}/topics/reclassify-threads", response_model=ReclassifyThreadsResponse)
async def reclassify_threads(
    course_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Reclassify all threads in a course with the current topics."""
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    topics = await TopicsService.get_topics(db, course_id)
    if not topics:
        raise HTTPException(400, detail="No topics found for this course")
    
    try:
        user_id = UUID(user["id"])
        result = await TopicsService.reclassify_all_threads(
            db=db,
            course_id=course_id,
            topics=topics,
            user_id=user_id,
        )
        return result
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to reclassify threads: {str(e)}")

@router.get(path="/courses/{course_id}/students/{student_id}/usage")
async def get_student_token_usage(
    course_id: UUID,
    student_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Get token usage for a specific student in a course, grouped by model."""
    # Verify instructor owns the course
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    # Get all thread IDs for this student in this course
    thread_ids = await ThreadService.get_thread_ids_by_course(db, course_id, student_id)
    
    # Get token usage grouped by model
    usage = await AIEventsService.get_token_usage_by_model(db, student_id, thread_ids)
    
    return usage

@router.get(path="/courses/{course_id}/students/{student_id}/threads")
async def get_student_threads(
    course_id: UUID,
    student_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Get threads for a specific student in a course with AI-generated summaries."""
    # Verify instructor owns the course
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    instructor_id = UUID(user["id"])
    
    # Get threads with summaries
    threads = await ThreadService.get_student_threads_with_summaries(
        db, course_id, student_id, instructor_id
    )
    
    return threads

@router.get(path="/courses/{course_id}/students/{student_id}/insights")
async def get_student_insights(
    course_id: UUID,
    student_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Get stored insights for a student, or return null if not generated yet."""
    # Verify instructor owns the course
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    # Get insights_id from enrollment
    insights_id = await InsightsStudentService.get_enrollment_insights_id(
        db, course_id, student_id
    )
    
    if not insights_id:
        return {"insights": None, "can_refresh": False}
    
    # Get insights data
    insights_data = await InsightsStudentService.get_insights_by_id(db, insights_id)
    
    if not insights_data:
        return {"insights": None, "can_refresh": False}
    
    # Check if renewable_at has passed
    renewable_at = insights_data.get("renewable_at")
    can_refresh = True
    if renewable_at:
        # Handle datetime comparison - ensure both are timezone-aware
        if isinstance(renewable_at, datetime):
            renewable_time = renewable_at
        else:
            renewable_time = renewable_at
        
        # Ensure timezone-aware
        if renewable_time.tzinfo is None:
            renewable_time = renewable_time.replace(tzinfo=timezone.utc)
        
        now = datetime.now(timezone.utc)
        can_refresh = now >= renewable_time
    
    return {
        "insights": {
            "summary": insights_data.get("summary", ""),
            "renewable_at": str(renewable_at) if renewable_at else None,
        },
        "can_refresh": can_refresh,
    }

@router.post(path="/courses/{course_id}/students/{student_id}/insights/generate")
async def generate_student_insights(
    course_id: UUID,
    student_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Generate or refresh insights for a student."""
    # Verify instructor owns the course
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, detail="Not authorized to view this course")
    
    instructor_id = UUID(user["id"])
    
    # Check if this is a refresh (insights already exist)
    existing_insights_id = await InsightsStudentService.get_enrollment_insights_id(
        db, course_id, student_id
    )
    is_refresh = existing_insights_id is not None
    
    # If refresh, check if renewable_at has passed
    if is_refresh:
        insights_data = await InsightsStudentService.get_insights_by_id(db, existing_insights_id)
        if insights_data:
            renewable_at = insights_data.get("renewable_at")
            if renewable_at:
                # Handle datetime comparison
                renewable_time = renewable_at
                if renewable_time.tzinfo is None:
                    renewable_time = renewable_time.replace(tzinfo=timezone.utc)
                
                now = datetime.now(timezone.utc)
                if now < renewable_time:
                    raise HTTPException(400, detail="Insights can be refreshed once every 7 days")
    
    try:
        # Generate and store insights
        insights_data = await InsightsStudentService.generate_and_store_insights(
            db, course_id, student_id, instructor_id, is_refresh=is_refresh
        )
        
        return {
            "insights": {
                "summary": insights_data.get("summary", ""),
                "renewable_at": str(insights_data.get("renewable_at")) if insights_data.get("renewable_at") else None,
            },
            "can_refresh": False,  # Just generated, so can't refresh yet
        }
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to generate insights: {str(e)}")

@router.post(path="/courses/{course_id}/announcements")
async def create_announcement(
    course_id: UUID,
    body: AnnouncementRequest,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Create a new announcement for a course."""
    # Verify instructor owns the course
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to create announcement for this course")
    
    announcement_id = await AnnouncementService.create_announcement(
        db, course_id, user["id"], body.title, body.content, body.file_ids
    )
    return {"id": announcement_id}

@router.get(path="/courses/{course_id}/announcements")
async def get_announcements(
    course_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Get all announcements for a course."""
    # Verify instructor owns the course
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to view announcements for this course")
    
    return await AnnouncementService.get_announcements_by_course(db, course_id)

@router.get(path="/announcements/{announcement_id}")
async def get_announcement(
    announcement_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Get a single announcement."""
    announcement = await AnnouncementService.get_announcement(db, announcement_id)
    
    # Verify instructor owns the course
    if not await UserService.verify_instructor_course(db, announcement.course_id, user["id"]):
        raise HTTPException(401, "Not authorized to view this announcement")
    
    return announcement

@router.patch(path="/announcements/{announcement_id}")
async def update_announcement(
    announcement_id: UUID,
    body: AnnouncementUpdate,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Update an announcement."""
    announcement = await AnnouncementService.update_announcement(
        db, announcement_id, user["id"], body.title, body.content, body.file_ids
    )
    return announcement

@router.delete(path="/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Delete an announcement."""
    await AnnouncementService.delete_announcement(db, announcement_id, user["id"])
    return {"deleted": True}

@router.get(path="/courses/{course_id}/rules/{rule_type}", response_model=CourseRulesResponse)
async def get_course_rules(
    course_id: UUID,
    rule_type: ThreadType,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Get rules for a course and rule type."""
    # Verify instructor owns the course
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to view this course")
    
    rules = await RulesService.get_course_rules(db, course_id, rule_type)
    
    if rules is None:
        raise HTTPException(404, "Rules not found for this course and rule type")
    
    return CourseRulesResponse(**rules)

@router.put(path="/courses/{course_id}/rules/{rule_type}", response_model=CourseRulesResponse)
async def update_course_rules(
    course_id: UUID,
    rule_type: ThreadType,
    body: CourseRulesRequest,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Update rules for a course and rule type. Sets the level to NULL to indicate custom rules."""
    # Verify instructor owns the course
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to edit this course")
    
    # Get current rules ID
    rules_ids = await CourseService.get_course_rules_ids(db, course_id)
    
    field_map = {
        ThreadType.writing: "writing_rules",
        ThreadType.testing: "testing_rules",
        ThreadType.debugging: "debugging_rules",
    }
    
    rules_id = rules_ids.get(field_map[rule_type])
    
    if rules_id is None:
        raise HTTPException(404, "Rules not found for this course and rule type")
    
    # Convert RuleObject list to dict list for database storage
    rules_data = body.model_dump(exclude_unset=True)
    
    if "prompt_rules" in rules_data and rules_data["prompt_rules"]:
        rules_data["prompt_rules"] = [rule.model_dump() if isinstance(rule, RuleObject) else rule for rule in rules_data["prompt_rules"]]
    
    if "output_rules" in rules_data and rules_data["output_rules"]:
        rules_data["output_rules"] = [rule.model_dump() if isinstance(rule, RuleObject) else rule for rule in rules_data["output_rules"]]
    
    # Update rules
    updated_rules = await RulesService.update_course_rules(db, rules_id, rules_data)
    
    # Set level to NULL to indicate custom rules
    level_field_map = {
        ThreadType.writing: "writing_level",
        ThreadType.testing: "testing_level",
        ThreadType.debugging: "debugging_level",
    }
    
    level_field = level_field_map[rule_type]
    await db.execute(
        f"UPDATE courses SET {level_field} = NULL WHERE id = $1",
        course_id
    )
    
    return CourseRulesResponse(**updated_rules)

@router.post(path="/courses/{course_id}/rules/{rule_type}/reset", response_model=CourseRulesResponse)
async def reset_course_rules(
    course_id: UUID,
    rule_type: ThreadType,
    body: ResetRulesRequest,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Reset rules to default for a specific level."""
    # Verify instructor owns the course
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to edit this course")
    
    # Duplicate default rules for the specified level
    new_rules_id = await RulesService.duplicate_default_rules(
        db, course_id, rule_type, body.level
    )
    
    # Update course to link new rules and set level
    field_map = {
        ThreadType.writing: ("writing_rules", "writing_level"),
        ThreadType.testing: ("testing_rules", "testing_level"),
        ThreadType.debugging: ("debugging_rules", "debugging_level"),
    }
    
    rules_field, level_field = field_map[rule_type]
    
    await db.execute(
        f"UPDATE courses SET {rules_field} = $1, {level_field} = $2 WHERE id = $3",
        new_rules_id, body.level, course_id
    )
    
    # Get updated rules
    updated_rules = await RulesService.get_rules_by_id(db, new_rules_id)
    
    if updated_rules is None:
        raise HTTPException(500, "Failed to retrieve updated rules")
    
    return CourseRulesResponse(**updated_rules)

@router.get(path="/courses/{course_id}/rules/{rule_type}/defaults")
async def get_level_defaults(
    course_id: UUID,
    rule_type: ThreadType,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Get available level defaults for a rule type."""
    # Verify instructor owns the course
    if not await UserService.verify_instructor_course(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to view this course")
    
    # Query level_defaults for this thread_type
    query = """
        SELECT DISTINCT level_idx
        FROM level_defaults
        WHERE thread_type = $1
        ORDER BY level_idx
    """
    
    rows = await db.fetch(query, rule_type.value)
    levels = [row["level_idx"] for row in rows]
    
    return {"levels": levels}

        
