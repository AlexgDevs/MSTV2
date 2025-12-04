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
    ServiceEnroll
)

from ..schemas import CreateServiceModel, PatchServiceModel

class ServiceRepository:
    def __init__(
        self,
        session: AsyncSession) -> None:

        self._session = session

    async def get_all(self) -> List[Service]:
        services = await self._session.scalars(
            select(Service)
        )

        return services.all()

    async def get_by_id(
        self,
        service_id: int
    ) -> Service | None:

        service = await self._session.scalar(
            select(Service)
            .where(Service.id == service_id)
        )

        return service

    async def get_by_service_user_id(
        self,
        service_id: int,
        user_id: int) -> Service | None:

        service = await self._session.scalar(
            select(Service)
            .where(
                Service.id == service_id,
                Service.user_id == user_id)
        )

        return service

    async def get_detail_by_service_id(
        self,
        service_id: int
    ) -> Service | None:

        service = await self._session.scalar(
            select(Service)
            .where(
                Service.id == service_id)
            .options(
            selectinload(Service.users_enroll).selectinload(ServiceEnroll.user),
            selectinload(Service.templates),
            selectinload(Service.tags),
            selectinload(Service.dates),
            selectinload(Service.user)
        )
    )

        return service

    async def create_service(
        self,
        user_id: int,
        service_data: CreateServiceModel
    ) -> Service:

        # soon photo func for code in bytes 64
        new_service = Service(
            user_id=user_id, 
            **service_data.model_dump()
        )

        self._session.add(new_service)
        await self._session.flush()
        return new_service

    async def patch_update_service(
        self,
        service_id: int,
        service_update_data: PatchServiceModel
    ) -> Service:

        # soon photo func for code in bytes 64
        updating_service = Service(
            id=service_id, 
            **service_update_data.model_dump(exclude_none=True, exclude_unset=True)
        )

        await self._session.merge(updating_service)
        await self._session.flush()
        return updating_service


def get_service_repository(
    session: AsyncSession = Depends(db_config.session)
    ) -> ServiceRepository:

    return ServiceRepository(session)
