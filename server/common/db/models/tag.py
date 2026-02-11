from datetime import datetime, timezone
from re import M
from typing import TYPE_CHECKING, List

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)
from sqlalchemy.ext.associationproxy import association_proxy

from sqlalchemy import (
    String,
    DateTime,
    ForeignKey
)

from .. import Base, AssociationBase

if TYPE_CHECKING:
    from .service import Service
    from .user import User


class ServiceTagConnection(AssociationBase):
    __tablename__ = 'services_tag_connections'
    __mapper_args__ = {
        'exclude_properties': ['id']
    }
    service_id: Mapped[int] = mapped_column(
        ForeignKey('services.id'), primary_key=True)
    service: Mapped['Service'] = relationship(
        'Service', back_populates='tag_connections')
    tag_id: Mapped[int] = mapped_column(
        ForeignKey('tags.id'), primary_key=True)
    tag: Mapped['Tag'] = relationship(
        'Tag', back_populates='service_connections')


class Tag(Base):
    __tablename__ = 'tags'
    title: Mapped[str] = mapped_column(String(55))

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    user: Mapped['User'] = relationship(
        'User', back_populates='tags', uselist=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc))

    service_connections: Mapped[List['ServiceTagConnection']] = relationship(
        'ServiceTagConnection', back_populates='tag')

    services: association_proxy = association_proxy(
        'service_connections', 'service')

#demo hold mvp confirm