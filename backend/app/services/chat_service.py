"""Interface with the OpenAI API to perform:
- Student prompt rule checks
- Guardrailed chat completion
- Response rule checks
"""

import json
from typing import List, Tuple, Dict, Any, AsyncGenerator, Optional
from app.schemas.chat import ChatRequest, ChatResponse, MessageEntry
from app.schemas.log import MessageLog
from app.schemas.prompt_contract import build_system_prompt
from openai import OpenAI
from uuid import UUID
import asyncpg
from app.services.ai_events_service import AIEventsService


client = OpenAI()


def _format_rules(title: str, rules: List[str]) -> str:
    if not rules:
        return ""
    return f"{title}\n" + "\n".join(rules) + "\n"


class ChatService:

    # ------------ Stage 1: Student Rules Check ------------
    @staticmethod
    async def evaluate_student_rules(
        student_prompt: str,
        student_rules: List[str] | List[Dict[str, Any]],
        db: Optional[asyncpg.Connection] = None,
        user_id: Optional[UUID] = None,
        thread_id: Optional[UUID] = None,
    ) -> Tuple[bool, Dict[str, Any]]:
        """Evaluate the student's prompt against student rules.
        
        Args:
            student_prompt: The student's message
            student_rules: List of rule strings (legacy) or rule objects with 'type' and 'content'
            db: Database connection for AI event logging
            user_id: User ID for logging
            thread_id: Thread ID for logging
            
        Returns:
            (passed: bool, details: dict) where details includes:
                - violations: [{rule: number, type: string, reason: string}]
                - requires_file_search: bool
        """
        # Handle both old format (list of strings) and new format (list of dicts)
        if student_rules and isinstance(student_rules[0], dict):
            # New format with types
            formatted_rules = []
            for i, rule in enumerate(student_rules, 1):
                rule_type = rule.get("type", "REQUEST")
                content = rule.get("content", "")
                if content:
                    formatted_rules.append(f"{i}. [{rule_type}] {content}")
            
            rubric = {
                "instructions": (
                    "You are a rule auditor. Assess the student's prompt against these typed rules:\n"
                    "- REQUIRE rules: Must be satisfied (missing = violation)\n"
                    "- DENY rules: Must not be violated (present = violation)\n"
                    "- REQUEST rules: Desired but not required (no violation if missing)\n"
                    "- ALLOW rules: Explicitly permitted (informational only)\n"
                    "Identify violations by rule number, type, and reason. "
                    "Also infer if the prompt implies a need to inspect project files (file_search). "
                    "Return strictly valid JSON."
                ),
                "schema": {
                    "passed": "boolean",
                    "violations": "array of {rule: number, type: string, reason: string}",
                    "requires_file_search": "boolean"
                },
            }
        else:
            # Legacy format (list of strings)
            formatted_rules = [f"{i}. {rule}" for i, rule in enumerate(student_rules, 1)]
            
            rubric = {
                "instructions": (
                    "You are a rule auditor. Assess the student's prompt against the numbered rules. "
                    "Identify any violated rules by number and provide brief reasons. "
                    "Also infer if the prompt implies a need to inspect project files (file_search). "
                    "Return strictly valid JSON."
                ),
                "schema": {
                    "passed": "boolean",
                    "violations": "array of {rule: number, reason: string}",
                    "requires_file_search": "boolean"
                },
            }
        
        system = (
            "Return only JSON. Do not include any extra text.\n" +
            _format_rules("Rules:", formatted_rules)
        )
        user = (
            f"StudentPrompt:\n{student_prompt}\n\n" +
            f"Rubric:\n{json.dumps(rubric)}"
        )

        model = "gpt-5-nano"
        response = client.responses.create(
            model=model,
            input=system + "\n" + user,
        )
        
        # Extract usage and log event
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
                    purpose="student_rules_check",
                    response_id=getattr(response, 'id', None),
                )
            except Exception as e:
                print(f"Failed to log AI event for evaluate_student_rules: {str(e)}")
        
        text = response.output_text or "{}"
        try:
            data = json.loads(text)
            passed = bool(data.get("passed", False))
            details: Dict[str, Any] = {
                "violations": data.get("violations", []),
                "requires_file_search": bool(data.get("requires_file_search", False)),
            }
            return passed, details
        except Exception:
            return False, {"violations": [{"rule": 0, "reason": "Non-JSON response from auditor."}], "requires_file_search": False}

    # ------------ Stage 2: Full Prompt Chat ------------
    @staticmethod
    async def chat_with_full_prompt(
        system_prompt: str,
        messages: List[MessageEntry],
        vector_store_id: str | None = None,
        db: Optional[asyncpg.Connection] = None,
        user_id: Optional[UUID] = None,
        thread_id: Optional[UUID] = None,
        chat_id: Optional[UUID] = None,
    ) -> str:
        """Send chat with complete system prompt architecture.
        
        This uses a fully constructed system prompt that includes all layers:
        identity, pedagogy, course goals, topic, rules, and output requirements.
        
        Args:
            system_prompt: Complete system prompt string
            messages: Conversation history
            vector_store_id: Optional vector store for file_search
            db: Database connection for AI event logging
            user_id: User ID for logging
            thread_id: Thread ID for logging
            chat_id: Chat ID for logging
            
        Returns:
            Model response text
        """
        # Flatten messages (skip system messages)
        buf = []
        for m in messages:
            if m.role != "system":
                buf.append(f"{m.role}: {m.content}")
        convo = "\n".join(buf)
        
        model = "gpt-5.1"
        kwargs = {
            "model": model,
            "input": system_prompt + "\n" + convo,
        }
        
        if vector_store_id:
            kwargs["tools"] = [{"type": "file_search"}]
            kwargs["tool_resources"] = {"file_search": {"vector_store_ids": [vector_store_id]}}
        
        response = client.responses.create(**kwargs)
        
        # Extract usage and log event
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
                    chat_id=chat_id,
                    thread_id=thread_id,
                    purpose="student_chat",
                    response_id=getattr(response, 'id', None),
                )
            except Exception as e:
                print(f"Failed to log AI event for chat_with_full_prompt: {str(e)}")
        
        return response.output_text

    # ------------ Stage 2: Guardrailed Chat ------------
    @staticmethod
    async def chat_with_guardrails(
        messages: List[MessageEntry],
        guardrails: List[str],
        vector_store_id: str | None = None,
        db: Optional[asyncpg.Connection] = None,
        user_id: Optional[UUID] = None,
        thread_id: Optional[UUID] = None,
        chat_id: Optional[UUID] = None,
    ) -> str:
        """Send a chat to OpenAI with guardrails prepended as system guidance.
        If vector_store_id is provided, expose the file_search tool bound to that store.
        """
        # Use the unified prompt contract as the foundation
        system = build_system_prompt(level_guardrails=guardrails)

        # Flatten provided messages to a single input string (responses.create)
        # Skip system messages so rule violations don't pollute LLM context
        buf = []
        for m in messages:
            if m.role != "system":
                buf.append(f"{m.role}: {m.content}")
        convo = "\n".join(buf)

        model = "gpt-5.1"
        kwargs = {
            "model": model,
            "input": system + "\n" + convo,
        }
        if vector_store_id:
            kwargs["tools"] = [{"type": "file_search"}]
            kwargs["tool_resources"] = {"file_search": {"vector_store_ids": [vector_store_id]}}

        response = client.responses.create(**kwargs)
        
        # Extract usage and log event
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
                    chat_id=chat_id,
                    thread_id=thread_id,
                    purpose="student_chat",
                    response_id=getattr(response, 'id', None),
                )
            except Exception as e:
                print(f"Failed to log AI event for chat_with_guardrails: {str(e)}")
        
        return response.output_text

    # ------------ Stage 2b: Full Prompt Chat with Streaming ------------
    @staticmethod
    async def chat_with_full_prompt_stream(
        system_prompt: str,
        messages: List[MessageEntry],
        vector_store_id: str | None = None,
        usage_info: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream chat with complete system prompt architecture.
        
        Yields tokens as they arrive from the API.
        If usage_info dict is provided, it will be populated with usage data from the final event.
        
        Args:
            system_prompt: Complete system prompt string
            messages: Conversation history
            vector_store_id: Optional vector store for file_search
            usage_info: Optional dict to populate with usage data
            
        Yields:
            Tokens from the model response
        """
        # Flatten messages (skip system messages)
        buf = []
        for m in messages:
            if m.role != "system":
                buf.append(f"{m.role}: {m.content}")
        convo = "\n".join(buf)
        
        model = "gpt-5.1"
        kwargs = {
            "model": model,
            "input": system_prompt + "\n" + convo,
            "stream": True,
        }
        
        if vector_store_id:
            kwargs["tools"] = [{"type": "file_search"}]
            kwargs["tool_resources"] = {"file_search": {"vector_store_ids": [vector_store_id]}}
        
        # Stream the response - yields events as they arrive
        try:
            response_stream = client.responses.create(**kwargs)
            
            final_usage = None
            final_response_id = None
            for event in response_stream:
                # Handle text delta events from the streaming response
                if event.type == "response.output_text.delta":
                    yield event.delta
                # Check for final event with usage - check multiple possible locations
                elif event.type == "response.completed":
                    if hasattr(event, 'usage') and event.usage is not None:
                        final_usage = event.usage
                    elif hasattr(event, 'response') and hasattr(event.response, 'usage') and event.response.usage is not None:
                        final_usage = event.response.usage
                    # Try to get response_id from completed event
                    if hasattr(event, 'response') and hasattr(event.response, 'id'):
                        final_response_id = event.response.id
                    elif hasattr(event, 'id'):
                        final_response_id = event.id
                # Legacy checks for other event types
                elif hasattr(event, 'usage') and event.usage is not None:
                    final_usage = event.usage
                elif hasattr(event, 'response') and hasattr(event.response, 'usage') and event.response.usage is not None:
                    final_usage = event.response.usage
                
                # Try to capture response_id from any event
                if final_response_id is None:
                    if hasattr(event, 'response') and hasattr(event.response, 'id'):
                        final_response_id = event.response.id
                    elif hasattr(event, 'id'):
                        final_response_id = event.id
            
            # Store usage info if dict provided
            if usage_info is not None and final_usage is not None:
                usage_info['model'] = model
                usage_info['tokens_in'] = getattr(final_usage, 'input_tokens', None)
                usage_info['tokens_out'] = getattr(final_usage, 'output_tokens', None)
                usage_info['tokens_total'] = getattr(final_usage, 'total_tokens', None)
                if final_response_id:
                    usage_info['response_id'] = final_response_id
        except Exception as e:
            # Re-raise to be handled by the router
            raise Exception(f"OpenAI API error: {str(e)}") from e

    # ------------ Stage 2b: Guardrailed Chat with Streaming ------------
    @staticmethod
    async def chat_with_guardrails_stream(
        messages: List[MessageEntry],
        guardrails: List[str],
        vector_store_id: str | None = None,
        usage_info: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a chat response from OpenAI with guardrails prepended as system guidance.
        Yields tokens as they arrive from the API.
        If vector_store_id is provided, expose the file_search tool bound to that store.
        If usage_info dict is provided, it will be populated with usage data from the final event.
        """
        # Use the unified prompt contract as the foundation
        system = build_system_prompt(level_guardrails=guardrails)

        # Flatten provided messages to a single input string (responses.create)
        # Skip system messages so rule violations don't pollute LLM context
        buf = []
        for m in messages:
            if m.role != "system":
                buf.append(f"{m.role}: {m.content}")
        convo = "\n".join(buf)

        model = "gpt-5.1"
        kwargs = {
            "model": model,
            "input": system + "\n" + convo,
            "stream": True,
        }
        if vector_store_id:
            kwargs["tools"] = [{"type": "file_search"}]
            kwargs["tool_resources"] = {"file_search": {"vector_store_ids": [vector_store_id]}}

        # Stream the response - yields events as they arrive
        try:
            response_stream = client.responses.create(**kwargs)
            
            final_usage = None
            final_response_id = None
            for event in response_stream:
                # Handle text delta events from the streaming response
                if event.type == "response.output_text.delta":
                    yield event.delta
                # Check for final event with usage - check multiple possible locations
                elif event.type == "response.completed":
                    if hasattr(event, 'usage') and event.usage is not None:
                        final_usage = event.usage
                    elif hasattr(event, 'response') and hasattr(event.response, 'usage') and event.response.usage is not None:
                        final_usage = event.response.usage
                    # Try to get response_id from completed event
                    if hasattr(event, 'response') and hasattr(event.response, 'id'):
                        final_response_id = event.response.id
                    elif hasattr(event, 'id'):
                        final_response_id = event.id
                # Legacy checks for other event types
                elif hasattr(event, 'usage') and event.usage is not None:
                    final_usage = event.usage
                elif hasattr(event, 'response') and hasattr(event.response, 'usage') and event.response.usage is not None:
                    final_usage = event.response.usage
                
                # Try to capture response_id from any event
                if final_response_id is None:
                    if hasattr(event, 'response') and hasattr(event.response, 'id'):
                        final_response_id = event.response.id
                    elif hasattr(event, 'id'):
                        final_response_id = event.id
            
            # Store usage info if dict provided
            if usage_info is not None and final_usage is not None:
                usage_info['model'] = model
                usage_info['tokens_in'] = getattr(final_usage, 'input_tokens', None)
                usage_info['tokens_out'] = getattr(final_usage, 'output_tokens', None)
                usage_info['tokens_total'] = getattr(final_usage, 'total_tokens', None)
                if final_response_id:
                    usage_info['response_id'] = final_response_id
        except Exception as e:
            # Re-raise to be handled by the router
            raise Exception(f"OpenAI API error: {str(e)}") from e

    # ------------ Stage 3: Response Rules Check ------------
    @staticmethod
    async def evaluate_response_rules(
        student_prompt: str,
        model_response: str,
        response_rules: List[str] | List[Dict[str, Any]],
        db: Optional[asyncpg.Connection] = None,
        user_id: Optional[UUID] = None,
        thread_id: Optional[UUID] = None,
    ) -> Tuple[bool, Dict[str, Any]]:
        """Evaluate the model's response against response rules.
        
        Args:
            student_prompt: The student's original message
            model_response: The model's response to evaluate
            response_rules: List of rule strings (legacy) or rule objects with 'type' and 'content'
            db: Database connection for AI event logging
            user_id: User ID for logging
            thread_id: Thread ID for logging
            
        Returns:
            (passed: bool, details: dict) where details includes:
                - violations: [{rule: number, type: string, reason: string}]
                - require_violations: List of REQUIRE rule contents
                - deny_violations: List of DENY rule contents
        """
        # Handle both old format (list of strings) and new format (list of dicts)
        if response_rules and isinstance(response_rules[0], dict):
            # New format with types
            formatted_rules = []
            for i, rule in enumerate(response_rules, 1):
                rule_type = rule.get("type", "REQUEST")
                content = rule.get("content", "")
                if content:
                    formatted_rules.append(f"{i}. [{rule_type}] {content}")
            
            rubric = {
                "instructions": (
                    "You are a rule auditor. Assess the model's response against these typed rules:\n"
                    "- REQUIRE rules: Must be present in response (missing = violation)\n"
                    "- DENY rules: Must not be present in response (present = violation)\n"
                    "- REQUEST rules: Desired but not required\n"
                    "- ALLOW rules: Explicitly permitted (informational)\n"
                    "Flag violations with rule number, type, and reason. Return strictly valid JSON."
                ),
                "schema": {
                    "passed": "boolean",
                    "violations": "array of {rule: number, type: string, reason: string}"
                },
            }
        else:
            # Legacy format (list of strings)
            formatted_rules = [f"{i}. {rule}" for i, rule in enumerate(response_rules, 1)]
            
            rubric = {
                "instructions": (
                    "You are a rule auditor. Assess the model's response against the numbered rules. "
                    "Cite violated rule numbers with brief reasons. Return strictly valid JSON."
                ),
                "schema": {
                    "passed": "boolean",
                    "violations": "array of {rule: number, reason: string}"
                },
            }
        
        system = (
            "Return only JSON. Do not include any extra text.\n" +
            _format_rules("Rules:", formatted_rules)
        )
        user = (
            "StudentPrompt:\n" + student_prompt + "\n\n" +
            "ModelResponse:\n" + model_response + "\n\n" +
            f"Rubric:\n{json.dumps(rubric)}"
        )

        model = "gpt-5-nano"
        response = client.responses.create(
            model=model,
            input=system + "\n" + user,
        )
        
        # Extract usage and log event
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
                    purpose="response_rules_check",
                    response_id=getattr(response, 'id', None),
                )
            except Exception as e:
                print(f"Failed to log AI event for evaluate_response_rules: {str(e)}")
        
        text = response.output_text or "{}"
        try:
            data = json.loads(text)
            passed = bool(data.get("passed", False))
            violations = data.get("violations", [])
            
            # Separate violations by type for new format
            require_violations = []
            deny_violations = []
            
            for v in violations:
                v_type = v.get("type", "")
                if v_type == "REQUIRE":
                    # Get the rule content from response_rules
                    rule_num = v.get("rule", 0)
                    if response_rules and isinstance(response_rules[0], dict) and 0 < rule_num <= len(response_rules):
                        require_violations.append(response_rules[rule_num - 1].get("content", ""))
                elif v_type == "DENY":
                    # Get the rule content from response_rules
                    rule_num = v.get("rule", 0)
                    if response_rules and isinstance(response_rules[0], dict) and 0 < rule_num <= len(response_rules):
                        deny_violations.append(response_rules[rule_num - 1].get("content", ""))
            
            details: Dict[str, Any] = {
                "violations": violations,
                "require_violations": require_violations,
                "deny_violations": deny_violations,
            }
            return passed, details
        except Exception:
            return False, {
                "violations": [{"rule": 0, "reason": "Non-JSON response from auditor."}],
                "require_violations": [],
                "deny_violations": [],
            }

    # -------- Existing helpers (kept for compatibility) --------
    @staticmethod
    async def send_message(
        message: str,
        db: Optional[asyncpg.Connection] = None,
        user_id: Optional[UUID] = None,
    ) -> str:
        system = """
            All responses must be valid GitHub-Flavored Markdown.
            Do not emit HTML.
            If writing code, use fenced code blocks with language tags. \n
        """

        model = "gpt-5.1"
        response = client.responses.create(
            model=model,
            input=system + message,
        )
        
        # Extract usage and log event
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
                    purpose="general_chat",
                    response_id=getattr(response, 'id', None),
                )
            except Exception as e:
                print(f"Failed to log AI event for send_message: {str(e)}")
        
        return response.output_text

    @staticmethod
    async def create_title(
        message: str,
        db: Optional[asyncpg.Connection] = None,
        user_id: Optional[UUID] = None,
        thread_id: Optional[UUID] = None,
    ) -> str:
        get_title_input = """
            The following message is from a user.
            Create and return an appropriate title for the conversation and nothing else.
            Ensure the title is 20 characters or less. \n\n
        """
        model = "gpt-5-nano"
        response = client.responses.create(
            model=model,
            input=(get_title_input + message),
        )
        
        # Extract usage and log event
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
                    purpose="thread_name",
                    response_id=getattr(response, 'id', None),
                )
            except Exception as e:
                print(f"Failed to log AI event for create_title: {str(e)}")
        
        return response.output_text

    @staticmethod
    async def summarize_context(
        log: List[MessageLog],
        db: Optional[asyncpg.Connection] = None,
        user_id: Optional[UUID] = None,
        thread_id: Optional[UUID] = None,
    ) -> str:
        context_input = ""
        for chat in log:
            sender = chat.role
            context_input += sender
            context_input += chat.message
            context_input += "\n"

        model = "gpt-5.1"
        response = client.responses.create(
            model=model,
            instructions="Summarize the provided conversation between this user and chatbot",
            input=context_input,
        )
        
        # Extract usage and log event
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
                    purpose="summary",
                    response_id=getattr(response, 'id', None),
                )
            except Exception as e:
                print(f"Failed to log AI event for summarize_context: {str(e)}")
        
        return response.output_text

    @staticmethod
    async def generate_thread_summary(
        log: List[MessageLog],
        db: Optional[asyncpg.Connection] = None,
        user_id: Optional[UUID] = None,
        thread_id: Optional[UUID] = None,
    ) -> str:
        """Generate a 2-3 sentence summary focusing on student understanding and usage using gpt-5-nano."""
        context_input = ""
        for chat in log:
            sender = chat.role
            context_input += f"{sender}: {chat.message}\n"

        model = "gpt-5-nano"
        response = client.responses.create(
            model=model,
            instructions="Generate a 2-3 sentence summary of this conversation between a student and AI assistant. Focus on the student's understanding, what concepts they struggled with or demonstrated mastery of, and how they used the assistant's help. Write from a pedagogical perspective that would help an instructor understand the student's learning process and performance.",
            input=context_input,
        )
        
        # Extract usage and log event
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
                    purpose="summary",
                    response_id=getattr(response, 'id', None),
                )
            except Exception as e:
                print(f"Failed to log AI event for generate_thread_summary: {str(e)}")
        
        return response.output_text.strip()

    @staticmethod
    async def generate_pedagogical_analysis(
        thread_summaries: List[str],
        db: Optional[asyncpg.Connection] = None,
        user_id: Optional[UUID] = None,
        student_id: Optional[UUID] = None,
    ) -> str:
        """Generate a pedagogical analysis of a student's thread summaries focusing on struggles, strengths, and weaknesses."""
        if not thread_summaries:
            return "No thread summaries available for analysis."
        
        summaries_text = "\n\n".join([f"Thread {i+1}: {summary}" for i, summary in enumerate(thread_summaries)])
        
        model = "gpt-5-nano"
        response = client.responses.create(
            model=model,
            instructions="""You are an educational analyst reviewing a student's learning interactions. Analyze the provided thread summaries to provide a pedagogical assessment.

Focus on:
- Student struggles: What concepts, topics, or skills does the student consistently struggle with?
- Student strengths: What areas does the student demonstrate understanding or mastery?
- Learning patterns: How does the student approach problem-solving and learning?
- Areas for improvement: What specific topics or skills need more attention?

Write a clear, concise analysis (3-5 sentences) that would help an instructor understand this student's learning journey and provide targeted support.""",
            input=summaries_text,
        )
        
        # Extract usage and log event
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
                    purpose="pedagogical_analysis",
                    response_id=getattr(response, 'id', None),
                )
            except Exception as e:
                print(f"Failed to log AI event for generate_pedagogical_analysis: {str(e)}")
        
        return response.output_text.strip()
