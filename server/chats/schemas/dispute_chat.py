from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional


class SimpleUserForDisputeChatResponse(BaseModel):
    id: int
    name: str
    role: str


class SimpleDisputeMessageResponse(BaseModel):
    id: int
    content: str
    sender_id: int
    chat_id: int
    created_at: datetime
    sender: Optional[SimpleUserForDisputeChatResponse] = None

    class Config:
        from_attributes = True


class SimpleEnrollForDisputeChatResponse(BaseModel):
    id: int
    slot_time: str
    status: str
    price: int
    service_id: int
    service: Optional['SimpleServiceForDisputeChatResponse'] = None

    class Config:
        from_attributes = True


class SimpleServiceForDisputeChatResponse(BaseModel):
    id: int
    title: str
    description: str
    price: int

    class Config:
        from_attributes = True


class DisputeChatResponse(BaseModel):
    id: int
    master_id: int
    client_id: int
    arbitr_id: Optional[int]
    enroll_id: int
    dispute_id: int
    created_at: datetime
    master: Optional[SimpleUserForDisputeChatResponse] = None
    client: Optional[SimpleUserForDisputeChatResponse] = None
    arbitr: Optional[SimpleUserForDisputeChatResponse] = None
    enroll: Optional[SimpleEnrollForDisputeChatResponse] = None

    class Config:
        from_attributes = True


class DetailDisputeChatResponse(BaseModel):
    id: int
    master: SimpleUserForDisputeChatResponse
    client: SimpleUserForDisputeChatResponse
    arbitr: Optional[SimpleUserForDisputeChatResponse]
    enroll_id: int
    dispute_id: int
    messages: List[SimpleDisputeMessageResponse]
    created_at: datetime

    class Config:
        from_attributes = True


class CreateDisputeChatRequest(BaseModel):
    dispute_id: int

#demo hold mvp confirm