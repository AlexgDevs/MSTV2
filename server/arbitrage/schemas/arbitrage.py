from typing import Literal
from pydantic import BaseModel

from ...dispute.schemas import WinnerTypes


class TakeDisputeModel(BaseModel):
    dispute_id: int


class ResolveDisputeModel(BaseModel):
    dispute_id: int
    winner_type: WinnerTypes

#demo hold mvp confirm