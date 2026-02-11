from datetime import datetime
from typing import List, Literal, TYPE_CHECKING

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from sqlalchemy import (
    String,
    DateTime
)

if TYPE_CHECKING:
    from .messages import ServiceMessage, SupportMessage, DisputeMessage
    from .chats import ServiceChat, SupportChat, DisputeChat
    from .service import Service
    from .tag import Tag
    from .scheduletemplate import ScheduleTemplate
    from .service import ServiceEnroll
    from .accounts import Account
    from .dispute import Dispute


from .. import Base


class User(Base):
    __tablename__ = 'users'
    name: Mapped[str] = mapped_column(String(255))
    password: Mapped[str] = mapped_column(String(1024))

    email: Mapped[str] = mapped_column(String(512))
    verified_email: Mapped[bool] = mapped_column(default=False)
    verified_code: Mapped[str] = mapped_column(String(6), nullable=True)
    telegram_id: Mapped[int] = mapped_column(nullable=True)

    about: Mapped[str] = mapped_column(String(1024), nullable=True)
    joined: Mapped[DateTime] = mapped_column(DateTime, default=datetime.now)
    role: Mapped[Literal['user', 'admin', 'moderator', 'arbitr']
                ] = mapped_column(default='arbitr')

    templates: Mapped[List['ScheduleTemplate']] = relationship(
        'ScheduleTemplate', back_populates='user')
    tags: Mapped[List['Tag']] = relationship('Tag', back_populates='user')
    services: Mapped[List['Service']] = relationship(
        'Service', back_populates='user')

    services_enroll: Mapped[List['ServiceEnroll']] = relationship(
        'ServiceEnroll', back_populates='user')

    master_chats: Mapped[List['ServiceChat']] = relationship(
        'ServiceChat', foreign_keys='ServiceChat.master_id', back_populates='master')
    client_chats: Mapped[List['ServiceChat']] = relationship(
        'ServiceChat', foreign_keys='ServiceChat.client_id', back_populates='client')

    support_chats: Mapped[List['SupportChat']] = relationship(
        'SupportChat', foreign_keys='SupportChat.support_id', back_populates='support')
    client_support_chats: Mapped[List['SupportChat']] = relationship(
        'SupportChat', foreign_keys='SupportChat.client_id', back_populates='client')

    service_messages: Mapped[List['ServiceMessage']] = relationship(
        'ServiceMessage', foreign_keys='ServiceMessage.sender_id', back_populates='sender')
    support_messages: Mapped[List['SupportMessage']] = relationship(
        'SupportMessage', foreign_keys='SupportMessage.sender_id', back_populates='sender')
    dispute_messages: Mapped[List['DisputeMessage']] = relationship(
        'DisputeMessage', foreign_keys='DisputeMessage.sender_id', back_populates='sender')

    master_dispute_chats: Mapped[List['DisputeChat']] = relationship(
        'DisputeChat', foreign_keys='DisputeChat.master_id', back_populates='master')
    client_dispute_chats: Mapped[List['DisputeChat']] = relationship(
        'DisputeChat', foreign_keys='DisputeChat.client_id', back_populates='client')
    arbitr_dispute_chats: Mapped[List['DisputeChat']] = relationship(
        'DisputeChat', foreign_keys='DisputeChat.arbitr_id', back_populates='arbitr')

    client_disputes: Mapped[List['Dispute']] = relationship(
        'Dispute', foreign_keys='Dispute.client_id', back_populates='client')
    master_disputes: Mapped[List['Dispute']] = relationship(
        'Dispute', foreign_keys='Dispute.master_id', back_populates='master')
    arbitr_disputes: Mapped[List['Dispute']] = relationship(
        'Dispute', foreign_keys='Dispute.arbitr_id', back_populates='arbitr')

    account: Mapped['Account'] = relationship(
        'Account', back_populates='user', uselist=False)

#demo hold mvp confirm