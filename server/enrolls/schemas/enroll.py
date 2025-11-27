from datetime import datetime
from typing import Any, List, Literal, Dict

from pydantic import BaseModel

EnrollStatus = ['pending', 'confirmed', 'completed',
                        'cancelled', 'expired']

class CreateEnrollModel(BaseModel):
    service_id: int
    service_date_id: int
    slot_time: str
    price: int


class EnrollResponse(BaseModel):
    id: int
    service_id: int
    user_id: int
    service_date_id: int
    slot_time: str
    price: int
    status: Literal[EnrollStatus]
    created_at: datetime
