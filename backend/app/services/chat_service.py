"""Interface with the OpenAI API to perform:
- Student prompt rule checks
- Guardrailed chat completion
- Response rule checks
"""

import json
from typing import List, Tuple, Dict, Any, AsyncGenerator
from app.schemas.chat import ChatRequest, ChatResponse, MessageEntry
from app.schemas.log import MessageLog
from openai import OpenAI


client = OpenAI()


def _format_rules(title: str, rules: List[str]) -> str:
    if not rules:
        return ""
    return f"{title}\n" + "\n".join(rules) + "\n"


class ChatService:

    # ------------ Stage 1: Student Rules Check ------------
    @staticmethod
    async def evaluate_student_rules(student_prompt: str, student_rules: List[str]) -> Tuple[bool, Dict[str, Any]]:
        """Evaluate the student's prompt against the numbered student_rules.
        Returns (passed: bool, details: dict). details includes violations and an inferred requires_file_search flag.
        """
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
            _format_rules("Rules:", student_rules)
        )
        user = (
            f"StudentPrompt:\n{student_prompt}\n\n" +
            f"Rubric:\n{json.dumps(rubric)}"
        )

        response = client.responses.create(
            model="gpt-4.1",
            input=system + "\n" + user,
        )
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

    # ------------ Stage 2: Guardrailed Chat ------------
    @staticmethod
    async def chat_with_guardrails(
        messages: List[MessageEntry],
        guardrails: List[str],
        vector_store_id: str | None = None,
    ) -> str:
        """Send a chat to OpenAI with guardrails prepended as system guidance.
        If vector_store_id is provided, expose the file_search tool bound to that store.
        """
        system = (
            "All responses must be valid GitHub-Flavored Markdown.\n"
            "Do not emit HTML.\n"
            "If writing code, use fenced code blocks with language tags.\n\n"
        ) + _format_rules("Guardrails:", guardrails)

        # Flatten provided messages to a single input string (responses.create)
        # Skip system messages so rule violations don't pollute LLM context
        buf = []
        for m in messages:
            if m.role != "system":
                buf.append(f"{m.role}: {m.content}")
        convo = "\n".join(buf)

        kwargs = {
            "model": "gpt-4.1",
            "input": system + "\n" + convo,
        }
        if vector_store_id:
            kwargs["tools"] = [{"type": "file_search"}]
            kwargs["tool_resources"] = {"file_search": {"vector_store_ids": [vector_store_id]}}

        response = client.responses.create(**kwargs)
        return response.output_text

    # ------------ Stage 2b: Guardrailed Chat with Streaming ------------
    @staticmethod
    async def chat_with_guardrails_stream(
        messages: List[MessageEntry],
        guardrails: List[str],
        vector_store_id: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a chat response from OpenAI with guardrails prepended as system guidance.
        Yields tokens as they arrive from the API.
        If vector_store_id is provided, expose the file_search tool bound to that store.
        """
        system = (
            "All responses must be valid GitHub-Flavored Markdown.\n"
            "Do not emit HTML.\n"
            "If writing code, use fenced code blocks with language tags.\n\n"
        ) + _format_rules("Guardrails:", guardrails)

        # Flatten provided messages to a single input string (responses.create)
        # Skip system messages so rule violations don't pollute LLM context
        buf = []
        for m in messages:
            if m.role != "system":
                buf.append(f"{m.role}: {m.content}")
        convo = "\n".join(buf)

        kwargs = {
            "model": "gpt-4.1",
            "input": system + "\n" + convo,
            "stream": True,
        }
        if vector_store_id:
            kwargs["tools"] = [{"type": "file_search"}]
            kwargs["tool_resources"] = {"file_search": {"vector_store_ids": [vector_store_id]}}

        # Stream the response - yields events as they arrive
        try:
            response_stream = client.responses.create(**kwargs)
            
            for event in response_stream:
                # Handle text delta events from the streaming response
                if event.type == "response.output_text.delta":
                    yield event.delta
        except Exception as e:
            # Re-raise to be handled by the router
            raise Exception(f"OpenAI API error: {str(e)}") from e

    # ------------ Stage 3: Response Rules Check ------------
    @staticmethod
    async def evaluate_response_rules(student_prompt: str, model_response: str, response_rules: List[str]) -> Tuple[bool, Dict[str, Any]]:
        """Evaluate the model's response against response_rules. Returns (passed, details)."""
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
            _format_rules("Rules:", response_rules)
        )
        user = (
            "StudentPrompt:\n" + student_prompt + "\n\n" +
            "ModelResponse:\n" + model_response + "\n\n" +
            f"Rubric:\n{json.dumps(rubric)}"
        )

        response = client.responses.create(
            model="gpt-4.1",
            input=system + "\n" + user,
        )
        text = response.output_text or "{}"
        try:
            data = json.loads(text)
            passed = bool(data.get("passed", False))
            details: Dict[str, Any] = {"violations": data.get("violations", [])}
            return passed, details
        except Exception:
            return False, {"violations": [{"rule": 0, "reason": "Non-JSON response from auditor."}]}

    # -------- Existing helpers (kept for compatibility) --------
    @staticmethod
    async def send_message(message: str) -> str:
        system = """
            All responses must be valid GitHub-Flavored Markdown.
            Do not emit HTML.
            If writing code, use fenced code blocks with language tags. \n
        """

        response = client.responses.create(
            model="gpt-4.1",
            input=system + message,
        )
        return response.output_text

    @staticmethod
    async def create_title(message: str) -> str:
        get_title_input = """
            The following message is from a user.
            Create and return an appropriate title for the conversation and nothing else.
            Ensure the title is 20 characters or less. \n\n
        """
        response = client.responses.create(
            model="gpt-4.1",
            input=(get_title_input + message),
        )
        return response.output_text

    @staticmethod
    async def summarize_context(log: List[MessageLog]) -> str:
        context_input = ""
        for chat in log:
            sender = chat.role
            context_input += sender
            context_input += chat.message
            context_input += "\n"

        response = client.responses.create(
            model="gpt-4.1",
            instructions="Summarize the provided conversation between this user and chatbot",
            input=context_input,
        )
        return response.output_text
