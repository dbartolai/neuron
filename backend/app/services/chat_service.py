# interface with the openAI api to get chat completions

from typing import List
from app.schemas.chat import ChatRequest, ChatResponse, MessageEntry
from app.schemas.log import MessageLog
from openai import OpenAI


client = OpenAI()

class ChatService:

    @staticmethod
    async def send_message(message: str) -> str:

        system = """    
            All responses must be valid GitHub-Flavored Markdown.
            Do not emit HTML.
            If writing code, use fenced code blocks with language tags. \n
        """

        response = client.responses.create(
            model = "gpt-4.1",
            input = system + message,
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
        
