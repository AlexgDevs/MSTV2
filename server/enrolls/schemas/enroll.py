from datetime import datetime
from typing import Any, List, Literal, Dict

from pydantic import BaseModel

EnrollStatus = Literal['pending', 'confirmed',
                       'completed', 'cancelled', 'expired']


class CreateEnrollModel(BaseModel):
    service_id: int
    service_date_id: int
    slot_time: str
    price: int


class SimpleEnrollUserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class EnrollResponse(BaseModel):
    id: int
    service_id: int
    user_id: int
    service_date_id: int
    slot_time: str
    price: int
    status: EnrollStatus
    created_at: datetime
    user: SimpleEnrollUserResponse | None = None

    class Config:
        from_attributes = True
