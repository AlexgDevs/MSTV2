from datetime import datetime, timezone
from re import M
from typing import List, Literal

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)
from sqlalchemy.ext.associationproxy import association_proxy

from sqlalchemy import (
    String,
    DateTime,
    ForeignKey
)

from .. import Base


class ServiceEnroll(Base):
    __tablename__ = 'service_enrolls'
    slot_time: Mapped[str]
    status: Mapped[Literal['pending', 'confirmed', 'completed',
                           'cancelled', 'expired']] = mapped_column(default='pending')
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
