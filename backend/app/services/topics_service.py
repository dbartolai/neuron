"""Service for managing course topics and thread classification."""

import json
import asyncpg
from typing import List, Dict, Any, Optional
from uuid import UUID
from openai import OpenAI
from app.services.course_service import CourseService
from app.services.thread_service import ThreadService
from app.services.ai_events_service import AIEventsService

client = OpenAI()


class TopicsService:

    @staticmethod
    async def get_topics(db: asyncpg.Connection, course_id: UUID) -> List[str]:
        """Get all topics for a course."""
        topics = await CourseService.get_thread_tags(db, course_id)
        return topics if topics else []

    @staticmethod
    async def create_topic(db: asyncpg.Connection, course_id: UUID, topic_name: str) -> List[str]:
        """Add a new topic to the course."""
        topics = await TopicsService.get_topics(db, course_id)
        
        # Check if topic already exists
        if topic_name in topics:
            raise ValueError(f"Topic '{topic_name}' already exists")
        
        topics.append(topic_name)
        await CourseService.set_thread_tags(db, course_id, topics)
        return topics

    @staticmethod
    async def update_topic(
        db: asyncpg.Connection, 
        course_id: UUID, 
        old_name: str, 
        new_name: str
    ) -> List[str]:
        """Rename a topic and update all thread references."""
        topics = await TopicsService.get_topics(db, course_id)
        
        if old_name not in topics:
            raise ValueError(f"Topic '{old_name}' not found")
        
        if new_name in topics and new_name != old_name:
            raise ValueError(f"Topic '{new_name}' already exists")
        
        # Update topics array
        topics = [new_name if t == old_name else t for t in topics]
        await CourseService.set_thread_tags(db, course_id, topics)
        
        # Update all thread references
        query = """
            UPDATE threads
            SET topic = $2
            WHERE course_id = $1 AND topic = $3
        """
        await db.execute(query, course_id, new_name, old_name)
        
        return topics

    @staticmethod
    async def delete_topic(db: asyncpg.Connection, course_id: UUID, topic_name: str) -> List[str]:
        """Delete a topic. Orphaned threads will have thread_tag set to NULL."""
        topics = await TopicsService.get_topics(db, course_id)
        
        if topic_name not in topics:
            raise ValueError(f"Topic '{topic_name}' not found")
        
        # Remove topic from array
        topics = [t for t in topics if t != topic_name]
        await CourseService.set_thread_tags(db, course_id, topics)
        
        # Set thread_tag to NULL for threads using this topic
        query = """
            UPDATE threads
            SET topic = NULL
            WHERE course_id = $1 AND topic = $2
        """
        await db.execute(query, course_id, topic_name)
        
        return topics

    @staticmethod
    async def generate_topics_from_syllabus(
        db: asyncpg.Connection,
        file_id: UUID,
        course_id: UUID,
        course_name: str,
        course_code: str,
        user_id: Optional[UUID] = None,
    ) -> List[str]:
        """Extract topics from a syllabus file using OpenAI."""
        # Get the OpenAI file ID (file_id is UUID from our DB, need to get openai_file_id)
        from app.services.course_service import CourseService
        try:
            file_obj = await CourseService.get_course_file(db, file_id)
            openai_file_id = file_obj.openai_file_id
        except Exception as e:
            raise ValueError(f"Failed to get file: {str(e)}")
        
        # Get the vector store ID for this course (where the file is stored)
        vector_store_id = await CourseService.get_vector_store(db, course_id)
        if not vector_store_id:
            raise ValueError("Course vector store not found. Please ensure files are uploaded to the course.")
        
        # Create prompt for topic extraction
        system_prompt = """You are an educational assistant. Extract topic names from a course syllabus.

Use the file_search tool to read the syllabus file and extract specific topic names based on the actual course content.

Return ONLY a JSON array of topic names as strings. Each topic should be:
- 2-4 words maximum
- Descriptive of a course topic or module
- Distinct from other topics
- Based on the ACTUAL syllabus content (not generic topics)

Example format: ["Introduction to Programming", "Data Structures", "Algorithms", "Object-Oriented Design", "Database Systems", "Web Development", "Software Testing", "Project Management", "Version Control", "Deployment"]

Do not include any explanation, only the JSON array. Generate 8-12 topics that are specific to this course."""

        user_prompt = f"""Course: {course_name} ({course_code})

Read the syllabus file using file_search and extract topic names that are specific to this course. Look for course modules, units, or major topics covered in the syllabus.

Extract topic names from this syllabus."""

        try:
            model = "gpt-5-nano"
            # Use file_search tool to access the syllabus file from the vector store
            # vector_store_ids should be part of the tool definition, not tool_resources
            response = client.responses.create(
                model=model,
                input=system_prompt + "\n\n" + user_prompt,
                tools=[{
                    "type": "file_search",
                    "vector_store_ids": [str(vector_store_id)]
                }],
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
                        purpose="syllabus_topic_extraction",
                        response_id=getattr(response, 'id', None),
                    )
                except Exception as e:
                    print(f"Failed to log AI event for generate_topics_from_syllabus: {str(e)}")
            
            text = response.output_text.strip()
            
            # Clean up the response (remove markdown code blocks if present)
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()
            
            topics = json.loads(text)
            
            # Validate we got a list
            if not isinstance(topics, list):
                raise ValueError("Expected a list of topics")
            
            # Ensure all topics are strings
            topics = [str(topic).strip() for topic in topics if topic]
            
            if len(topics) == 0:
                raise ValueError("No topics extracted from syllabus")
            
            return topics
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse AI response as JSON: {e}")
        except Exception as e:
            raise ValueError(f"AI topic extraction failed: {str(e)}")

    @staticmethod
    async def classify_thread_to_topic(
        db: asyncpg.Connection,
        thread_id: UUID,
        thread_title: str,
        first_message: str,
        topics: List[str],
        user_id: Optional[UUID] = None,
    ) -> Optional[str]:
        """Classify a single thread into one of the provided topics using gpt-4o-mini."""
        if not topics:
            return None
        
        try:
            # Create classification prompt
            system_prompt = """You are a classification assistant. Classify a student discussion thread into one of the provided topic categories.

Return ONLY the exact topic name from the provided list that best matches the thread's content. Do not include any explanation or additional text."""

            user_prompt = f"""Thread Title: {thread_title}
First Student Message: {first_message[:500]}

Available Topics: {', '.join(topics)}

Which topic best categorizes this thread? Return only the topic name."""

            model = "gpt-5-nano"
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
                        thread_id=thread_id,
                        purpose="thread_classification",
                        response_id=getattr(response, 'id', None),
                    )
                except Exception as e:
                    print(f"Failed to log AI event for classify_thread_to_topic: {str(e)}")
            
            classified_topic = response.output_text.strip()
            
            # Clean up the response
            classified_topic = classified_topic.strip('"\'`').strip()
            
            # Validate the topic is in our list
            if classified_topic in topics:
                return classified_topic
            
            # Try to find a close match (case-insensitive)
            topic_lower = classified_topic.lower()
            for topic in topics:
                if topic.lower() == topic_lower:
                    return topic
            
            # Fallback to first topic if no match found
            return topics[0] if topics else None
                        
        except Exception as e:
            print(f"Failed to classify thread {thread_id}: {str(e)}")
            # Fallback to first topic on error
            return topics[0] if topics else None

    @staticmethod
    async def reclassify_all_threads(
        db: asyncpg.Connection,
        course_id: UUID,
        topics: List[str],
        user_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """Reclassify all threads in a course with the current topics."""
        threads = await ThreadService.get_threads_with_messages(db, course_id)
        
        if not threads:
            return {"classified": 0, "failed": 0, "total": 0}
        
        classified_count = 0
        failed_count = 0
        
        for thread in threads:
            thread_id = thread["id"]
            thread_title = thread.get("title", "")
            first_message = thread.get("first_message", "")
            
            if not first_message:
                continue
            
            try:
                topic = await TopicsService.classify_thread_to_topic(
                    db, thread_id, thread_title, first_message, topics, user_id
                )
                
                if topic:
                    await ThreadService.update_thread_tag(db, thread_id, topic)
                    classified_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                print(f"Failed to classify thread {thread_id}: {str(e)}")
                failed_count += 1
        
        return {
            "classified": classified_count,
            "failed": failed_count,
            "total": len(threads)
        }

    @staticmethod
    async def get_course_topics(db: asyncpg.Connection, course_id: UUID) -> List[str]:
        """Get all topics for a course (alias for get_topics)."""
        return await TopicsService.get_topics(db, course_id)

    @staticmethod
    async def detect_topic_from_prompt(
        db: asyncpg.Connection,
        course_id: UUID,
        student_prompt: str,
        user_id: Optional[UUID] = None,
        thread_id: Optional[UUID] = None,
    ) -> Optional[str]:
        """Detect which course topic the student is asking about.
        
        Called during thread creation to classify the thread's topic.
        
        Args:
            db: Database connection
            course_id: Course UUID
            student_prompt: The first message in the thread
            user_id: Optional user ID for AI event logging
            thread_id: Optional thread ID for AI event logging
        
        Returns:
            Topic name or None if no clear match
        """
        # Get course topics from database
        topics = await TopicsService.get_course_topics(db, course_id)
        
        if not topics:
            return None
        
        # Build detection prompt
        topics_list = ", ".join(topics)
        detection_prompt = f"""Given the following course topics: {topics_list}

Which ONE topic is the student asking about in this prompt:
"{student_prompt}"

Return ONLY the topic name exactly as listed, or "NONE" if unclear."""
        
        # Call LLM for detection (using gpt-5-nano for efficiency)
        model = "gpt-5-nano"
        response = client.responses.create(
            model=model,
            input=detection_prompt,
        )
        
        # Log AI event
        usage = getattr(response, 'usage', None)
        if db and usage:
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
                    purpose="topic_detection",
                    response_id=getattr(response, 'id', None),
                )
            except Exception as e:
                print(f"Failed to log AI event for topic detection: {str(e)}")
        
        detected = response.output_text.strip()
        
        # Validate detected topic is in the list
        if detected in topics:
            return detected
        
        return None
