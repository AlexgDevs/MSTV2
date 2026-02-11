from typing import Literal, Optional
from datetime import datetime
from pydantic import BaseModel

DisputeStatus = Literal[
    'wait_for_arbitr',
    'in_process',
    'closed'
]

WinnerTypes = Literal[
    'client',
    'master',
    'split'
]


class SimpleUserDisputResponse(BaseModel):
    id: int
    name: str
    role: Literal['user', 'admin', 'moderator', 'arbitr']


class SimpleEnrollDisputResponse(BaseModel):
    id: int
    slot_time: str 
    status: Literal['pending', 'confirmed', 'ready', 'completed',
                    'cancelled', 'expired', 'waiting_payment']
    price: int
    created_at: datetime
    user_id: int
    service_id: int
    service_date_id: int 


class DisputeResponse(BaseModel):
    id: int
    client_id: int
    master_id: int
    enroll_id: int
    arbitr_id: Optional[int] = None
    reason: str
    disput_status: DisputeStatus
    winner_type: Optional[WinnerTypes] = None
    created_at: datetime
    taken_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class DetailDisputRespone(BaseModel):
    id: int
    client: SimpleUserDisputResponse
    master: SimpleUserDisputResponse
    arbitr: Optional[SimpleUserDisputResponse] = None
    enroll: SimpleEnrollDisputResponse
    reason: str
    disput_status: DisputeStatus
    winner_type: Optional[WinnerTypes] = None
    created_at: datetime
    taken_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CreateDisputeModel(BaseModel):
    master_id: int
    enroll_id: int
    reason: str

#demo hold mvp confirm