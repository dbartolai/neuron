"""Service for generating and managing course insights using AI."""

import json
import asyncpg
from typing import List, Dict, Any, Optional
from uuid import UUID
from openai import OpenAI
from app.services.thread_service import ThreadService
from app.services.course_service import CourseService
from app.services.log_service import LogService
from app.services.ai_events_service import AIEventsService
from app.schemas.chat import ChatRole

client = OpenAI()


class InsightsService:

    @staticmethod
    async def generate_thread_tags(
        db: asyncpg.Connection,
        course_id: UUID,
        user_id: Optional[UUID] = None,
    ) -> List[str]:
        """AI-powered tag generation. Generates 10 topic tags based on thread content."""
        # Get course info
        course_name = await CourseService.get_course_name_by_id(db, course_id)
        course_code = await CourseService.get_course_code(db, course_id)
        
        # Get threads with their first student messages
        threads = await ThreadService.get_threads_with_messages(db, course_id)
        
        if not threads:
            raise ValueError("No threads found for this course")
        
        # Prepare sample data for AI
        sample_threads = threads[:20]  # Use up to 20 threads as sample
        thread_samples = []
        for thread in sample_threads:
            thread_info = {
                "title": thread.get("title", ""),
                "first_message": thread.get("first_message", "")[:500]  # Limit message length
            }
            thread_samples.append(thread_info)
        
        # Create prompt for tag generation
        system_prompt = """You are an educational analytics assistant. Analyze student discussion threads and generate exactly 10 distinct topic categories that represent the main themes or subjects students are asking about.

Return ONLY a JSON array of exactly 10 tag names as strings. Each tag should be:
- 2-4 words maximum
- Descriptive of a topic category
- Distinct from other tags
- Relevant to the course content

Example format: ["Virtual Memory", "Process Management", "File Systems", "System Calls", "Memory Allocation", "Concurrency", "I/O Operations", "Kernel Architecture", "Device Drivers", "Security"]

Do not include any explanation, only the JSON array."""

        user_prompt = f"""Course: {course_name} ({course_code})

Sample student threads:
{json.dumps(thread_samples, indent=2)}

Generate 10 topic tags that categorize these student discussions."""

        try:
            model = "gpt-5.1"
            response = client.responses.create(
                model=model,
                input=system_prompt + "\n\n" + user_prompt,
            )
            
            # Extract usage and log event
            usage = getattr(response, 'usage', None)
            if usage:
                try:
                    tokens_in = getattr(usage, 'input_tokens', None)
                    tokens_out = getattr(usage, 'output_tokens', None)
                    tokens_total = getattr(usage, 'total_tokens', None)
                    
                    await AIEventsService.log_ai_event(
                        db=db,
                        provider="openai",
                        model=model,
                        user_id=user_id,
                        tokens_in=tokens_in,
                        tokens_out=tokens_out,
                        tokens_total=tokens_total,
                        purpose="thread_tags",
                        response_id=getattr(response, 'id', None),
                    )
                except Exception as e:
                    print(f"Failed to log AI event for generate_thread_tags: {str(e)}")
            
            text = response.output_text.strip()
            
            # Clean up the response (remove markdown code blocks if present)
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()
            
            tags = json.loads(text)
            
            # Validate we got exactly 10 tags
            if not isinstance(tags, list) or len(tags) != 10:
                raise ValueError(f"Expected 10 tags, got {len(tags) if isinstance(tags, list) else 'non-list'}")
            
            # Ensure all tags are strings
            tags = [str(tag).strip() for tag in tags if tag]
            
            if len(tags) != 10:
                raise ValueError(f"Expected 10 tags after cleaning, got {len(tags)}")
            
            return tags
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse AI response as JSON: {e}")
        except Exception as e:
            raise ValueError(f"AI tag generation failed: {str(e)}")

    @staticmethod
    async def classify_threads(
        db: asyncpg.Connection,
        course_id: UUID,
        tags: List[str],
        user_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """AI-powered thread classification. Classifies each thread into one of the tags."""
        # Get all threads with their first messages
        threads = await ThreadService.get_threads_with_messages(db, course_id)
        
        if not threads:
            return {"classified": 0, "failed": 0}
        
        classified_count = 0
        failed_count = 0
        
        # Classify each thread
        for thread in threads:
            thread_id = thread["id"]
            thread_title = thread.get("title", "")
            first_message = thread.get("first_message", "")
            
            if not first_message:
                # Skip threads without student messages
                continue
            
            try:
                # Create classification prompt
                system_prompt = """You are a classification assistant. Classify a student discussion thread into one of the provided topic categories.

Return ONLY the exact tag name from the provided list that best matches the thread's content. Do not include any explanation or additional text."""

                user_prompt = f"""Thread Title: {thread_title}
First Student Message: {first_message[:500]}

Available Tags: {', '.join(tags)}

Which tag best categorizes this thread? Return only the tag name."""

                model = "gpt-5.1"
                response = client.responses.create(
                    model=model,
                    input=system_prompt + "\n\n" + user_prompt,
                )
                
                # Extract usage and log event for each classification
                usage = getattr(response, 'usage', None)
                if usage:
                    try:
                        tokens_in = getattr(usage, 'input_tokens', None)
                        tokens_out = getattr(usage, 'output_tokens', None)
                        tokens_total = getattr(usage, 'total_tokens', None)
                        
                        await AIEventsService.log_ai_event(
                            db=db,
                            provider="openai",
                            model=model,
                            user_id=user_id,
                            tokens_in=tokens_in,
                            tokens_out=tokens_out,
                            tokens_total=tokens_total,
                            thread_id=thread_id,
                            purpose="thread_classification",
                            response_id=getattr(response, 'id', None),
                        )
                    except Exception as e:
                        print(f"Failed to log AI event for classify_threads: {str(e)}")
                
                classified_tag = response.output_text.strip()
                
                # Clean up the response
                classified_tag = classified_tag.strip('"\'`').strip()
                
                # Validate the tag is in our list
                if classified_tag in tags:
                    await ThreadService.update_thread_tag(db, thread_id, classified_tag)
                    classified_count += 1
                else:
                    # Try to find a close match (case-insensitive)
                    tag_lower = classified_tag.lower()
                    matched_tag = None
                    for tag in tags:
                        if tag.lower() == tag_lower:
                            matched_tag = tag
                            break
                    
                    if matched_tag:
                        await ThreadService.update_thread_tag(db, thread_id, matched_tag)
                        classified_count += 1
                    else:
                        # Assign to first tag as fallback
                        await ThreadService.update_thread_tag(db, thread_id, tags[0])
                        classified_count += 1
                        failed_count += 1
                        
            except Exception as e:
                # On error, assign to first tag as fallback
                try:
                    await ThreadService.update_thread_tag(db, thread_id, tags[0])
                    classified_count += 1
                    failed_count += 1
                except:
                    failed_count += 1
        
        return {
            "classified": classified_count,
            "failed": failed_count,
            "total": len(threads)
        }
