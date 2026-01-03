from pydantic import BaseModel

class EmailSend(BaseModel):
    sender: str
    recipient: str
    subject: str
    body: str