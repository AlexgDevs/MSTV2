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
    Service
)

from ..repositories import (
    ServiceRepository,
    get_service_repository
)

from ..schemas import CreateServiceModel, PatchServiceModel

class ServiceUseCase:
    def __init__(
        self,
        session: AsyncSession,
        service_repository: ServiceRepository) -> None:
        
        self._session = session
        self._service_repository = service_repository

    async def create_service(
        self,
        user_id: int,
        service_data: CreateServiceModel
    ) -> Service | dict:

        try:
            new_service = await self._service_repository.create_service(
            user_id,
            service_data) 
            await self._session.commit()
            return new_service
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error('error', f'failed creating service: {str(e)}')
            return {'status': 'failed creating service', 'detail': str(e)}

    async def update_service(
        self,
        user_id: int,
        service_id: int,
        update_service_data: PatchServiceModel
    ) -> Service | dict:

        service = await self._session.scalar(
            select(Service)
            .where(
                Service.user_id == user_id,
                Service.id == service_id)
        )

        if not service:
            return {'status': 'failed updating service', 'detail': 'service not found'}

        try:
            updating_service = await self._service_repository.patch_update_service(
                service_id,
                update_service_data
            )
            await self._session.commit()
            return updating_service
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error('error', f'failed updating service: {str(e)}')
            return {'status': 'failed updating service', 'detail': {str(e)}}


def get_service_usecase(
    session: AsyncSession = Depends(db_config.session),
    service_repository: ServiceRepository = Depends(get_service_repository)
) -> ServiceUseCase:

    return ServiceUseCase(
        session,
        service_repository
    )