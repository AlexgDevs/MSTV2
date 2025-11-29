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
    ScheduleTemplate
)

from ..schemas import (
    CreateScheduleTemplateModel,
    PatchScheduleTemplateModel
)


class ScheduleTemplateRepository:
    def __init__(
            self,
            session: AsyncSession) -> None:

        self._session = session

    async def get_all(self) -> List[ScheduleTemplate]:
        templates = await self._session.scalars(
            select(ScheduleTemplate)
        )

        return templates.all()

    async def get_by_id(
            self,
            template_id: int) -> ScheduleTemplate | None:

        template = await self._session.scalar(
            select(ScheduleTemplate)
            .where(ScheduleTemplate.id == template_id)
        )

        return template

    async def get_all_by_service_user_id(
            self,
            service_id: int,
            user_id: int) -> List[ScheduleTemplate]:

        templates = await self._session.scalars(
            select(ScheduleTemplate)
            .where(
                ScheduleTemplate.user_id == user_id, 
                ScheduleTemplate.service_id == service_id)
        )

        return templates.all()

    async def create_template(
        self,
        user_id: int,
        template_data: CreateScheduleTemplateModel
    ) -> ScheduleTemplate:

        new_template = ScheduleTemplate(
            user_id=user_id,
            **template_data.model_dump()
        )


        self._session.add(new_template)
        await self._session.flush()
        return new_template

    async def patch_update_template(
        self,
        template_id: int,
        updating_template_data: PatchScheduleTemplateModel
    ) -> ScheduleTemplate:

        updating_template = ScheduleTemplate(
            id=template_id,
            **updating_template_data.model_dump(
                exclude_none=True,
                exclude_unset=True
            )
        )

        await self._session.merge(updating_template)
        await self._session.flush()
        return updating_template


def get_schedule_template_repository(
    session: AsyncSession = Depends(db_config.session)
) -> ScheduleTemplateRepository:

    return ScheduleTemplateRepository(session)
