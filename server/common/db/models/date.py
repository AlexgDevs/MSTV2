from typing import List, TYPE_CHECKING

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from sqlalchemy import (
    ForeignKey,
    JSON,
)

from .. import Base

if TYPE_CHECKING:
    from .service import ServiceEnroll, Service


class ServiceDate(Base):
    __tablename__ = 'dates'
    date: Mapped[str]
    slots = mapped_column(JSON)

    service_id: Mapped[int] = mapped_column(ForeignKey('services.id'))
    service: Mapped['Service'] = relationship(
        'Service', back_populates='dates')

    enrolls: Mapped[List['ServiceEnroll']] = relationship(
        'ServiceEnroll', back_populates='service_date')
