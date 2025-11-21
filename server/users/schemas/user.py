from datetime import datetime
from typing import Any, List, Literal

from pydantic import BaseModel


class SimpleUserScheduleTemplate(BaseModel):
    id: int
    day: str
    hours_work: dict[str, Any]
    is_active: bool
    service_id: int | None = None

    class Config:
        from_attributes = True


class SimpleUserService(BaseModel):
    id: int
    title: str
    price: int
    created_at: datetime

    class Config:
        from_attributes = True


class SimpleServiceEnroll(BaseModel):
    id: int
    slot_time: str
    status: Literal['pending', 'confirmed', 'completed', 'cancelled', 'expired']
    price: int
    service_id: int
    service_date_id: int

    class Config:
        from_attributes = True


class SimpleUserTag(BaseModel):
    id: int
    title: str
    service_id: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class CreateUserModel(BaseModel):
    name: str
    password: str
    email: str
    verified_token: str
    about: str | None = None


class UserResponse(BaseModel):
    id: int
    name: str
    about: str | None
    role: Literal['user', 'admin', 'moderator']

    class Config:
        from_attributes = True


class DetailUserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: Literal['user', 'admin', 'moderator']
    templates: List[SimpleUserScheduleTemplate] 
    services: List[SimpleUserService]
    services_enroll: List[SimpleServiceEnroll] 
    tags: List[SimpleUserTag]

    class Config:
        from_attributes = True

