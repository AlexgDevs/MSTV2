from datetime import datetime, timezone
from typing import TYPE_CHECKING, List

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
)

if TYPE_CHECKING:
    from .service import Service, ServiceEnroll
    from .user import User
    from .messages import ServiceMessage, SupportMessage, DisputeMessage
    from .dispute import Dispute

from .. import Base


class ServiceChat(Base):
    __tablename__ = 'service_chats'
    __table_args__ = (
        Index('ux_service_chats_master_client_service',
              'master_id', 'client_id', 'service_id', unique=True),
    )

    service_id: Mapped[int] = mapped_column(ForeignKey('services.id'))
    master_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    client_id: Mapped[int] = mapped_column(ForeignKey('users.id'))

    created_at: Mapped[DateTime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc))

    service: Mapped['Service'] = relationship(
        'Service', back_populates='chats')
    master: Mapped['User'] = relationship(
        'User', foreign_keys=[master_id], back_populates='master_chats')
    client: Mapped['User'] = relationship(
        'User', foreign_keys=[client_id], back_populates='client_chats')

    messages: Mapped[List['ServiceMessage']] = relationship(
        'ServiceMessage', back_populates='chat', cascade="all, delete-orphan")


class SupportChat(Base):
    __tablename__ = 'support_chats'
    __table_args__ = (
        Index('ux_support_chats_client_support',
              'client_id', 'support_id', unique=True),
    )

    client_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    support_id: Mapped[int] = mapped_column(ForeignKey('users.id'))

    created_at: Mapped[DateTime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc))

    support: Mapped['User'] = relationship(
        'User', foreign_keys=[support_id], back_populates='support_chats')
    client: Mapped['User'] = relationship(
        'User', foreign_keys=[client_id], back_populates='client_support_chats')

    messages: Mapped[List['SupportMessage']] = relationship(
        'SupportMessage', back_populates='chat', cascade="all, delete-orphan")


class DisputeChat(Base):
    __tablename__ = 'dispute_chats'
    __table_args__ = (
        Index('ux_dispute_chats_dispute', 'dispute_id', unique=True),
    )

    master_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    client_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    arbitr_id: Mapped[int | None] = mapped_column(
        ForeignKey('users.id'), nullable=True)
    enroll_id: Mapped[int] = mapped_column(ForeignKey('service_enrolls.id'))
    dispute_id: Mapped[int] = mapped_column(
        ForeignKey('disputes.id'), unique=True)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc))

    master: Mapped['User'] = relationship(
        'User', foreign_keys=[master_id], back_populates='master_dispute_chats')
    client: Mapped['User'] = relationship(
        'User', foreign_keys=[client_id], back_populates='client_dispute_chats')
    arbitr: Mapped['User | None'] = relationship(
        'User', foreign_keys=[arbitr_id], back_populates='arbitr_dispute_chats')
    enroll: Mapped['ServiceEnroll'] = relationship(
        'ServiceEnroll', foreign_keys=[enroll_id], back_populates='dispute_chat')
    dispute: Mapped['Dispute'] = relationship(
        'Dispute', back_populates='dispute_chat', uselist=False)

    messages: Mapped[List['DisputeMessage']] = relationship(
        'DisputeMessage', back_populates='chat', cascade="all, delete-orphan")
