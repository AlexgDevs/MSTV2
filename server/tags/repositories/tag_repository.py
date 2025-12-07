from fastapi import Depends
from sqlalchemy.orm import session
from ..schemas import CreateTagModel

from ...common.db import (
    AsyncSession,
    Tag,
    db_config
)


class TagRepository:
    def __init__(
            self,
            session: AsyncSession) -> None:

        self._session = session

    async def create_tag(
        self,
        user_id: int,
        tag_data: CreateTagModel
    ):

        cleaning_data = tag_data.model_dump()
        cleaning_data['title'] = tag_data.title.lower()

        new_tag = Tag(
            user_id=user_id,
            **cleaning_data
        )

        self._session.add(new_tag)
        await self._session.flush()
        return new_tag


def get_tag_repository(
    session: AsyncSession = Depends(db_config.session)
) -> TagRepository:
    return TagRepository(session)
