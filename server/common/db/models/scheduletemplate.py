from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from sqlalchemy import (
    ForeignKey,
    JSON
)

from .. import Base


class ScheduleTemplate(Base):
    __tablename__ = 'scheduletemplates'
    day: Mapped[str]
    hours_work = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(default=True)

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    user: Mapped['User'] = relationship(
        'User', back_populates='templates', uselist=False)

    service_id: Mapped[int] = mapped_column(ForeignKey('services.id'))
    service: Mapped['Service'] = relationship(
        'Service', back_populates='templates', uselist=False)
