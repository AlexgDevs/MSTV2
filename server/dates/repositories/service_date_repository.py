from tempfile import template
from typing import List

from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError

from ...common.db import (
    AsyncSession,
    User,
    db_config,
    joinedload,
    select,
    selectinload,
    Service,
    ServiceDate
)

from ..schemas import (
    CreateServiceDate
)

class ServiceDateRepository:
    def __init__(
        self,
        session: AsyncSession) -> None:

        self._session = session

    async def get_all(self):
        dates = await self._session.scalars(
            select(ServiceDate)
        )

        return dates.all() 

    async def get_all_by_service_id(
        self,
        service_id: int
    ):

        dates = await self._session.scalars(
            select(ServiceDate)
            .where(ServiceDate.service_id == service_id)
        )

        return dates.all()

    async def create_date(
        self,
        service_date_data: CreateServiceDate
    ):

    
        new_date = ServiceDate(**service_date_data.model_dump())
        self._session.add(new_date)
        await self._session.flush()
        return new_date


def get_service_date_repository(
    session: AsyncSession = Depends(db_config.session)
) -> ServiceDateRepository:
    return ServiceDateRepository(session)