from datetime import datetime
from typing import Literal, List, TYPE_CHECKING
from pydantic import BaseModel

if TYPE_CHECKING:
    from ...common.db.models.messages import ServiceMessage


class CreatedServiceChat(BaseModel):
    service_id: int
    master_id: int
    # client_id берется из токена пользователя, не нужно отправлять


class SimpleServiceForChatResponse(BaseModel):
    id: int
    title: str
    description: str
    user_id: int
    price: int


class SimpleUserForChatResponse(BaseModel):
    id: int
    name: str
    about: str | None = None
    role: Literal['user', 'admin', 'moderator']


class SimpleMessageForChatResponse(BaseModel):
    id: int
    content: str
    created_at: datetime
    sender_id: int
    sender: SimpleUserForChatResponse

    @classmethod
    def from_orm_with_chat(cls, message: 'ServiceMessage', chat_master_id: int):
        return cls(
            id=message.id,
            content=message.content,
            created_at=message.created_at,
            sender_id=message.sender_id,
            sender=SimpleUserForChatResponse.model_validate(message.sender),
            is_master=message.sender_id == chat_master_id
        )


class ServiceChatResponse(BaseModel):
    id: int
    service_id: int
    client_id: int
    master_id: int
    created_at: datetime
    client: SimpleUserForChatResponse | None = None
    master: SimpleUserForChatResponse | None = None
    service: SimpleServiceForChatResponse | None = None

    class Config:
        from_attributes = True


class DetailServiceChat(BaseModel):
    id: int
    client: SimpleUserForChatResponse
    master: SimpleUserForChatResponse
    service: SimpleServiceForChatResponse
    messages: List[SimpleMessageForChatResponse]
    created_at: datetime

    class Config:
        from_attributes = True
