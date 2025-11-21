from datetime import datetime, timezone

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from sqlalchemy import (
    String,
    DateTime,
    ForeignKey
)

from .. import Base


class Tag(Base):
    __tablename__ = 'tags'
    title: Mapped[str] = mapped_column(String(55))

    service_id: Mapped[int] = mapped_column(ForeignKey('services.id'))
    service: Mapped['Service'] = relationship(
        'Service', back_populates='tags', uselist=False)

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    user: Mapped['User'] = relationship(
        'User', back_populates='tags', uselist=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, default=datetime.now(timezone.utc))
