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


class CreateServiceDate(BaseModel):
    date: str  # format dd-mm-YYYY
    slots: Dict[TimeSlot, Status]
    service_id: int


class ServiceDateResponse(BaseModel):
    date: str
    slots: Dict[TimeSlot, Status]
    service_id: int
