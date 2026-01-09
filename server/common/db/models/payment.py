from datetime import datetime, timezone
from typing import Literal, TYPE_CHECKING

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)
from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    Numeric,
    Text,
)

from .. import Base

if TYPE_CHECKING:
    from .service import ServiceEnroll


class Payment(Base):
    __tablename__ = 'payments'

    enroll_id: Mapped[int] = mapped_column(
        ForeignKey('service_enrolls.id'), nullable=True)
    enroll: Mapped['ServiceEnroll'] = relationship(
        'ServiceEnroll', back_populates='payment', uselist=False
    )

    yookassa_payment_id: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=True)

    yookassa_status: Mapped[str] = mapped_column(String(50), nullable=True)

    amount: Mapped[int]
    currency: Mapped[str] = mapped_column(String(3), default='RUB')

    status: Mapped[Literal['pending', 'processing', 'succeeded', 'canceled', 'failed']] = mapped_column(
        default='pending'
    )

    description: Mapped[str] = mapped_column(Text, nullable=True)
    # JSON string for additional data
    payment_metadata: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc)
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc)
    )
    paid_at: Mapped[DateTime] = mapped_column(DateTime, nullable=True)

    confirmation_url: Mapped[str] = mapped_column(Text, nullable=True)
