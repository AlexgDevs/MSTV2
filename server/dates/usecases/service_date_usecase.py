from typing import List

from dotenv.main import logger
from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import session

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

from ..repositories import (
    ServiceDateRepository,
    get_service_date_repository
)

from ..schemas import CreateServiceDate


class ServiceDateUseCase:
    def __init__(
        self,
        session: AsyncSession,
        service_date_repository: ServiceDateRepository) -> None:

        self._session = session
        self._service_date_repo = service_date_repository

    async def  create_service_date(
        self,
        user_id: int,
        service_date_data: CreateServiceDate
    ) -> ServiceDate | dict:
        # soon check date if есть то выкидываем
        service = await self._session.scalar(
            select(Service)
            .where(
                Service.id == service_date_data.service_id,
                Service.user_id == user_id)
        )

        if not service:
            return {'status': 'failed creating service date', 'detail': 'service not found'}

        try:
            new_date = await self._service_date_repo.create_date(
                service_date_data
            )
            await self._session.commit()
            return new_date
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error('error', f'failed creating service date, detail: {str(e)}')
            return {'status': 'failed creating service date', 'detail': str(e)}


def get_service_date_use_case(
    session: AsyncSession = Depends(db_config.session),
    service_date_repository: ServiceDateRepository = Depends(get_service_date_repository)
) -> ServiceDateUseCase:
    return ServiceDateUseCase(
        session,
        service_date_repository
    )
