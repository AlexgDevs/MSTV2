from datetime import datetime
from typing import Any, List, Literal, Dict, Optional

from pydantic import BaseModel


TimeSlot = Literal[
    '01:00', '02:00', '03:00', '04:00', '05:00', '06:00',
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'
]

Status = Literal["available", "booked", "break", "unavailable"]

Days = Literal["monday", "tuesday", "wednesday",
               "thursday", "friday", "saturday", "sunday"]


class SimpleServiceTagResponse(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True


class CreateServiceModel(BaseModel):
    title: str
    description: str
    price: int
    photo: str
    certificate: str


class PatchServiceModel(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    photo: Optional[str] = None
    certificate: Optional[str] = None


class ServiceResponse(BaseModel):
    id: int
    title: str
    description: str
    user_id: int
    price: int
    photo: str
    certificate: str
    tags: List[SimpleServiceTagResponse]

    class Config:
        from_attributes = True


class SimpleServiceTemplateResponse(BaseModel):
    id: int
    day: Days
    hours_work: Dict[TimeSlot, Status]
    is_active: bool
    user_id: int

    class Config:
        from_attributes = True


class SimpleServiceDateResponse(BaseModel):
    id: int
    date: str
    slots: Dict[TimeSlot, Status]

    class Config:
        from_attributes = True


class SimpleServiceUserResponse(BaseModel):
    id: int
    name: str
    about: str | None
    role: Literal['user', 'admin', 'moderator', 'arbitr']

    class Config:
        from_attributes = True


class SimpleServiceUserEnroll(BaseModel):
    user: SimpleServiceUserResponse

    class Config:
        from_attributes = True


class DetailServiceResponse(BaseModel):
    id: int
    title: str
    description: str
    user_id: int
    price: int
    photo: str
    certificate: str

    templates: List[SimpleServiceTemplateResponse]
    tags: List[SimpleServiceTagResponse]
    dates: List[SimpleServiceDateResponse]
    user: SimpleServiceUserResponse
    users_enroll: List[SimpleServiceUserEnroll]

    class Config:
        from_attributes = True

#demo hold mvp confirm