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
)

if TYPE_CHECKING:
    from .service import Service
    from .user import User

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
