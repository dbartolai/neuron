from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.dependencies.db import get_db
from app.dependencies.auth import me
from app.dependencies.client import supabase
from app.schemas.user import User, InstructorActivate, ProfileRole
from uuid import UUID
from typing import List, Optional, Annotated, Dict
from app.services.course_service import CourseService
from app.services.user_service import UserService
from app.services.enroll_service import EnrollService
from app.services.thread_service import ThreadService
from app.services.insights_service import InsightsService
from app.schemas.course import NewCourse, PatchCourse, CourseFileRequest, CourseFile
from app.schemas.insights import InsightsStatus, TagStatistics, UpdateTagsRequest, UpdateThreadTagRequest
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
        if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/markdown"]:
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

        

        
