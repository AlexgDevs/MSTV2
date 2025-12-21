from fastapi import Depends
from sqlalchemy import (
    select,
)

from sqlalchemy.exc import SQLAlchemyError

from ..repositories import (
    TagRepository,
    get_tag_repository
)

from ..schemas import (
    CreateTagModel,
    PatchTagModel
)

from ...common.db import (
    AsyncSession,
    Service,
    db_config,
    Tag
)

from ...common.utils import (
    logger
)


class TagUseCase:
    def __init__(
            self,
            session: AsyncSession,
            tag_repository: TagRepository) -> None:

        self._session = session
        self._tag_repository = tag_repository

    async def create_tag(
        self,
        user_id: int,
        tag_data: CreateTagModel
    ):

        service = await self._session.scalar(
            select(Service)
            .where(Service.id == tag_data.service_id, Service.user_id == user_id)
        )

        if not service:
            return {'status': 'failed creating tag for service', 'detail': 'service not found'}

        tag = await self._session.scalar(
            select(Tag)
            .where(Tag.title == tag_data.title.lower())
        )

        if tag:
            return {'status': 'failed creating tag for service', 'detail': 'tag is alredy'}

        try:
            new_tag = await self._tag_repository.create_tag(
                user_id,
                tag_data
            )
            await self._session.commit()
            return new_tag
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error('error', f'failed creating tag, detail: {e}')
            return {'status': 'failed creating tag', 'detail': str(e)}


def get_tag_usecase(
    session: AsyncSession = Depends(db_config.session),
    tag_repository: TagRepository = Depends(get_tag_repository)
) -> TagUseCase:
    return TagUseCase(
        session,
        tag_repository
    )
