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
    ServiceEnroll,
    Tag,
    ServiceTagConnection
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
            .options(
                selectinload(Service.tag_connections).selectinload(
                    ServiceTagConnection.tag)
            )
        )

        return services.all()

    async def get_by_id(
        self,
        service_id: int
    ) -> Service | None:

        service = await self._session.scalar(
            select(Service)
            .where(Service.id == service_id)
            .options(
                selectinload(Service.tag_connections).selectinload(
                    ServiceTagConnection.tag)
            )
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
            .options(
                selectinload(Service.tag_connections).selectinload(
                    ServiceTagConnection.tag)
            )
        )

        return service

    async def get_all_by_category_name(
        self,
        category_name: str
    ) -> List[Service]:
        services = await self._session.scalars(
            select(Service)
            .join(ServiceTagConnection)
            .join(Tag)
            .where(Tag.title == category_name)
            .options(
                selectinload(Service.tag_connections).selectinload(
                    ServiceTagConnection.tag)
            )
        )
        return services.all()

    async def get_detail_by_service_id(
        self,
        service_id: int
    ) -> Service | None:

        service = await self._session.scalar(
            select(Service)
            .where(
                Service.id == service_id)
            .options(
                selectinload(Service.users_enroll).selectinload(
                    ServiceEnroll.user),
                selectinload(Service.templates),
                selectinload(Service.tag_connections).selectinload(
                    ServiceTagConnection.tag),
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

    async def delete_service(
        self,
        service_id: int,
        user_id: int
    ) -> bool:

        service = await self._session.scalar(
            select(Service)
            .where(
                Service.id == service_id,
                Service.user_id == user_id)
        )

        if not service:
            return False

        await self._session.delete(service)
        await self._session.flush()
        return True


def get_service_repository(
    session: AsyncSession = Depends(db_config.session)
) -> ServiceRepository:

    return ServiceRepository(session)
