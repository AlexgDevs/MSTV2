from datetime import datetime
from typing import List, Literal

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from sqlalchemy import (
    String,
    DateTime
)

from .. import Base


class User(Base):
    __tablename__ = 'users'
    name: Mapped[str] = mapped_column(String(255))
    password: Mapped[str] = mapped_column(String(1024))
    
    email: Mapped[str] = mapped_column(String(512))
    verified_email: Mapped[bool] = mapped_column(default=True)
    verified_token: Mapped[str] = mapped_column(String(256), nullable=True)
    
    about: Mapped[str] = mapped_column(String(1024), nullable=True)
    joined: Mapped[DateTime] = mapped_column(DateTime, default=datetime.now)
    role: Mapped[Literal['user', 'admin', 'moderator']] = mapped_column(default='user')
    
    templates: Mapped[List['ScheduleTemplate']] = relationship('ScheduleTemplate', back_populates='user')
    tags: Mapped[List['Tag']] = relationship('Tag', back_populates='user')
    services: Mapped[List['Service']] = relationship('Service', back_populates='user')

    services_enroll: Mapped[List['ServiceEnroll']] = relationship('ServiceEnroll', back_populates='user')