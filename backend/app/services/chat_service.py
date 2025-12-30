# interface with the openAI api to get chat completions

from typing import List
from app.schemas.chat import ChatRequest, ChatResponse, MessageEntry
from app.schemas.log import MessageLog
from openai import OpenAI


client = OpenAI()

class ChatService:

    @staticmethod
    async def send_message(message: str) -> str:

        response = client.responses.create(
            model = "gpt-4.1",
            input = message,
        )

        return response.output_text
    
    @staticmethod
    async def create_title(message: str) -> str:

        get_title_input = """
            The following message is from a user asking about their programming assignment.
            Create and return an appropriate title for the conversation and nothing else: \n\n
        """
        response = client.responses.create(
            model = "gpt-4.1",
            input = (get_title_input + message),
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
            model = "gpt-4.1",
            instructions="Summarize the provided conversation between this user and chatbot",
            input = context_input,
        )
        
        return response.output_text
        
