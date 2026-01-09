from typing import List, TYPE_CHECKING, Literal, Optional
from datetime import datetime, timezone

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from sqlalchemy import (
    ForeignKey,
    String,
    DateTime
)

from .. import Base

if TYPE_CHECKING:
    from .user import User
    from .service import ServiceEnroll
    from .chats import DisputeChat


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


class Dispute(Base):
    __tablename__ = 'disputes'
    client_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    master_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    enroll_id: Mapped[int] = mapped_column(ForeignKey('service_enrolls.id'))
    arbitr_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey('users.id'), nullable=True)

    client: Mapped['User'] = relationship(
        'User',
        foreign_keys=[client_id],
        back_populates='client_disputes',
        uselist=False
    )

    master: Mapped['User'] = relationship(
        'User',
        foreign_keys=[master_id],
        back_populates='master_disputes',
        uselist=False
    )

    arbitr: Mapped[Optional['User']] = relationship(
        'User',
        foreign_keys=[arbitr_id],
        back_populates='arbitr_disputes',
        uselist=False
    )

    enroll: Mapped['ServiceEnroll'] = relationship(
        'ServiceEnroll',
        foreign_keys=[enroll_id],
        back_populates='disputes',
        uselist=False
    )

    dispute_chat: Mapped['DisputeChat'] = relationship(
        'DisputeChat',
        foreign_keys='DisputeChat.dispute_id',
        back_populates='dispute',
        uselist=False
    )

    reason: Mapped[str] = mapped_column(String(1024))
    disput_status: Mapped[DisputeStatus] = mapped_column(
        default='wait_for_arbitr')

    winner_type: Mapped[WinnerTypes] = mapped_column(
        nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc)
    )

    taken_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )

    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )
