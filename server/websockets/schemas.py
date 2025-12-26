from pydantic import BaseModel
from typing import Optional, List

class SendNotificationRequest(BaseModel):
    user_id: int
    title: str
    message: str
    type: Optional[str] = "info"
    data: Optional[dict] = None


class SendNotificationToMultipleRequest(BaseModel):
    user_ids: List[int]
    title: str
    message: str
    type: Optional[str] = "info"
    data: Optional[dict] = None