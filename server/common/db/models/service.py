from datetime import datetime, timezone
from re import M
from typing import List, Literal, TYPE_CHECKING

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)
from sqlalchemy.ext.associationproxy import association_proxy

from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    Index
)

if TYPE_CHECKING:
    from .date import ServiceDate
    from .user import User
    from .payment import Payment
    from .tag import Tag, ServiceTagConnection
    from .scheduletemplate import ScheduleTemplate
    from .chats import ServiceChat, DisputeChat
    from .accounts import Account
    from .dispute import Dispute


from .. import Base


class ServiceEnroll(Base):
    __tablename__ = 'service_enrolls'
    __table_args__ = (
        Index('ux_service_enrolls_date_slot',
            'service_date_id', 'slot_time', unique=True),
    )
    # pending - when user booked the slot and waiting for confirmation
    # waiting_payment - when user booked the slot and waiting for payment
    # confirmed - when service owner confirmed the slot
    # ready - when service owner is ready to perform the service
    # completed - when service owner completed the service
    # cancelled - when user cancelled the slot
    # expired - when slot expired
    slot_time: Mapped[str]
    status: Mapped[Literal['pending', 'confirmed', 'ready', 'completed',
                        'cancelled', 'expired', 'waiting_payment']] = mapped_column(default='waiting_payment')
    price: Mapped[int]
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc))

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    user: Mapped['User'] = relationship(
        'User', back_populates='services_enroll')

    service_date_id: Mapped[int] = mapped_column(ForeignKey('dates.id'))
    service_date: Mapped['ServiceDate'] = relationship(
        'ServiceDate', back_populates='enrolls')

    service_id: Mapped[int] = mapped_column(ForeignKey('services.id'))
    service: Mapped['Service'] = relationship(
        'Service', back_populates='users_enroll')

    payment: Mapped['Payment'] = relationship(
        'Payment', back_populates='enroll', uselist=False, cascade="all, delete-orphan")

    disputes: Mapped[List['Dispute']] = relationship(
        'Dispute', foreign_keys='Dispute.enroll_id', back_populates='enroll')

    dispute_chat: Mapped['DisputeChat'] = relationship(
        'DisputeChat', foreign_keys='DisputeChat.enroll_id', back_populates='enroll', uselist=False)


class Service(Base):
    __tablename__ = 'services'
    title: Mapped[str] = mapped_column(String(128))
    description: Mapped[str] = mapped_column(String(896))
    photo: Mapped[str] = mapped_column(nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc))
    price: Mapped[int]

    templates: Mapped[List['ScheduleTemplate']] = relationship(
        'ScheduleTemplate', back_populates='service', cascade="all, delete-orphan")
    dates: Mapped[List['ServiceDate']] = relationship(
        'ServiceDate', back_populates='service', cascade="all, delete-orphan")

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    user: Mapped['User'] = relationship(
        'User', back_populates='services', uselist=False)

    users_enroll: Mapped[List['ServiceEnroll']] = relationship(
        'ServiceEnroll', back_populates='service', cascade="all, delete-orphan")

    tag_connections: Mapped[List['ServiceTagConnection']] = relationship(
        'ServiceTagConnection', back_populates='service', cascade="all, delete-orphan")

    tags: association_proxy = association_proxy('tag_connections', 'tag')

    chats: Mapped[List['ServiceChat']] = relationship(
        'ServiceChat', back_populates='service', cascade="all, delete-orphan")
