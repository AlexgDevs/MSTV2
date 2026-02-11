from datetime import datetime
from typing import Optional, Literal, Dict, Any
from pydantic import BaseModel


PaymentStatus = Literal['pending', 'processing',
                        'succeeded', 'canceled', 'failed']


class CreatePaymentModel(BaseModel):
    enroll_id: int
    return_url: Optional[str] = None


class PaymentServiceInfo(BaseModel):
    id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    master_name: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    enroll_id: Optional[int]
    yookassa_payment_id: Optional[str]
    amount: int
    currency: str
    status: PaymentStatus
    description: Optional[str]
    confirmation_url: Optional[str]
    created_at: datetime
    paid_at: Optional[datetime]
    service: Optional[PaymentServiceInfo] = None
    enroll_date: Optional[str] = None
    enroll_time: Optional[str] = None

    class Config:
        from_attributes = True


class PaymentStatusResponse(BaseModel):
    status: PaymentStatus
    yookassa_status: Optional[str]
    confirmation_url: Optional[str]
    paid_at: Optional[datetime]


class YooKassaWebhookModel(BaseModel):
    type: str  # notification
    event: str  # payment.succeeded, payment.canceled, payment.waiting_for_capture
    object: dict  # payment date an yookassa

#demo hold mvp confirm