from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    String
)

if TYPE_CHECKING:
    from .chats import ServiceChat, SupportChat, DisputeChat
    from .user import User

from .. import Base


class ServiceMessage(Base):
    __tablename__ = 'service_messages'
    content: Mapped[str] = mapped_column(String(1024))
    chat_id: Mapped[int] = mapped_column(ForeignKey('service_chats.id'))
    sender_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    sender: Mapped['User'] = relationship(
        'User', foreign_keys=[sender_id], back_populates='service_messages')
    chat: Mapped['ServiceChat'] = relationship(
        'ServiceChat', back_populates='messages', uselist=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc))


class SupportMessage(Base):
    __tablename__ = 'support_messages'
    content: Mapped[str] = mapped_column(String(1024))
    chat_id: Mapped[int] = mapped_column(ForeignKey('support_chats.id'))
    sender_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    sender: Mapped['User'] = relationship(
        'User', foreign_keys=[sender_id], back_populates='support_messages')
    chat: Mapped['SupportChat'] = relationship(
        'SupportChat', back_populates='messages', uselist=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc))


class DisputeMessage(Base):
    __tablename__ = 'dispute_messages'
    content: Mapped[str] = mapped_column(String(1024))
    chat_id: Mapped[int] = mapped_column(ForeignKey('dispute_chats.id'))
    sender_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    sender: Mapped['User'] = relationship(
        'User', foreign_keys=[sender_id], back_populates='dispute_messages')
    chat: Mapped['DisputeChat'] = relationship(
        'DisputeChat', back_populates='messages', uselist=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc))

#demo hold mvp confirm