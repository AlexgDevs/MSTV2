from datetime import datetime
from pydantic import BaseModel
from typing import List

class SupportChatResponse(BaseModel):
    id: int
    client_id: int
    support_id: int
    created_at: datetime


class SimpleUserForChatSupportResponse(BaseModel):
    id: int
    name: str


class SimpleUserForChatSupportResponse(BaseModel):
    id: int
    name: str


class SimpleSupportMessageResponse(BaseModel):
    id: int
    content: str
    created_at: datetime
    sender_id: int
    sender: SimpleUserForChatSupportResponse
    class Config:
        from_attributes = True


class DetailSupportChatResponse(BaseModel):
    id: int
    client_id: int
    support_id: int
    created_at: datetime
    client: SimpleUserForChatSupportResponse
    support: SimpleUserForChatSupportResponse
    messages: List[SimpleSupportMessageResponse]

    class Config:
        from_attributes = True


class CreatedSupportChat(BaseModel):
    support_id: int