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

from ...tags.repositories import (
    TagRepository,
    get_tag_repository
)

from ...common.db import Tag, ServiceTagConnection


class ServiceUseCase:
    def __init__(
            self,
            session: AsyncSession,
            service_repository: ServiceRepository,
            tag_repository: TagRepository = None) -> None:

        self._session = session
        self._service_repository = service_repository
        self._tag_repository = tag_repository

    async def create_service(
        self,
        user_id: int,
        service_data: CreateServiceModel,
        existing_tags: List[str] = None,
        custom_tags: List[str] = None
    ) -> Service | dict:

        try:
            new_service = await self._service_repository.create_service(
                user_id,
                service_data)
            await self._session.flush()

            if self._tag_repository and (existing_tags or custom_tags):
                if existing_tags:
                    for tag_title in existing_tags:
                        if not tag_title or not tag_title.strip():
                            continue
                        tag_title = tag_title.strip()

                        existing_tag = await self._session.scalar(
                            select(Tag).where(Tag.title == tag_title)
                        )

                        if existing_tag:

                            existing_connection = await self._session.scalar(
                                select(ServiceTagConnection).where(
                                    ServiceTagConnection.service_id == new_service.id,
                                    ServiceTagConnection.tag_id == existing_tag.id
                                )
                            )
                            if not existing_connection:
                                connection = ServiceTagConnection(
                                    service_id=new_service.id,
                                    tag_id=existing_tag.id
                                )
                                self._session.add(connection)
                        else:
                            new_tag = Tag(
                                title=tag_title,
                                user_id=user_id
                            )
                            self._session.add(new_tag)
                            await self._session.flush()

                            connection = ServiceTagConnection(
                                service_id=new_service.id,
                                tag_id=new_tag.id
                            )
                            self._session.add(connection)

                if custom_tags:
                    for tag_title in custom_tags:
                        if not tag_title or not tag_title.strip():
                            continue
                        tag_title = tag_title.strip()

                        existing_tag = await self._session.scalar(
                            select(Tag).where(Tag.title == tag_title)
                        )

                        if existing_tag:
                            existing_connection = await self._session.scalar(
                                select(ServiceTagConnection).where(
                                    ServiceTagConnection.service_id == new_service.id,
                                    ServiceTagConnection.tag_id == existing_tag.id
                                )
                            )
                            if not existing_connection:
                                connection = ServiceTagConnection(
                                    service_id=new_service.id,
                                    tag_id=existing_tag.id
                                )
                                self._session.add(connection)
                        else:
                            new_tag = Tag(
                                title=tag_title,
                                user_id=user_id
                            )
                            self._session.add(new_tag)
                            await self._session.flush()

                            connection = ServiceTagConnection(
                                service_id=new_service.id,
                                tag_id=new_tag.id
                            )
                            self._session.add(connection)

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
            return {'status': 'failed updating service', 'detail': str(e)}


    async def delete_service(
        self,
        user_id: int,
        service_id: int
    ) -> bool | dict:

        try:
            deleted = await self._service_repository.delete_service(
                service_id,
                user_id
            )
            if not deleted:
                return {'status': 'failed deleting service', 'detail': 'service not found'}
            await self._session.commit()
            return True
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error('error', f'failed deleting service: {str(e)}')
            return {'status': 'failed deleting service', 'detail': str(e)}


def get_service_usecase(
    session: AsyncSession = Depends(db_config.session),
    service_repository: ServiceRepository = Depends(get_service_repository),
    tag_repository: TagRepository = Depends(get_tag_repository)
) -> ServiceUseCase:

    return ServiceUseCase(
        session,
        service_repository,
        tag_repository
    )

#demo hold mvp confirm