from datetime import datetime
from typing import Any, List, Literal, Dict

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


class CreateScheduleTemplateModel(BaseModel):
    day: Days
    hours_work: Dict[TimeSlot, Status]
    is_active: bool
    service_id: int


class PatchScheduleTemplateModel(BaseModel):
    day: str | None = None 
    hours_work: Dict[TimeSlot, Status] | None = None
    is_active: bool | None = None
    service_id: int | None = None


class ScheduleTemplateResponse(BaseModel):
    id: int
    hours_work: Dict[TimeSlot, Status]
    is_active: bool
    user_id: int
    service_id: int


class SimpleScheduleTemplateUserResponse(BaseModel):
    id: int
    name: str
    role: Literal['admin', 'user', 'moderator']

    class Config:
        from_attributes = True


class SimpleScheduleTemplateServiceResponse(BaseModel):
    id: int
    title: str
    description: str

    class Config:
        from_attributes = True


class ScheduleTemplateDetailResponse(BaseModel):
    id: int
    hours_work: Dict[TimeSlot, Status]
    is_active: bool
    user_id: int
    service_id: int

    user: SimpleScheduleTemplateUserResponse
    service: SimpleScheduleTemplateServiceResponse

    class Config:
        from_attributes = True