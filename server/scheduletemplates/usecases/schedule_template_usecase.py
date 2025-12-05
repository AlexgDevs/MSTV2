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
    ScheduleTemplate
)

from ..repositories import (
    ScheduleTemplateRepository,
    get_schedule_template_repository
)

from ..schemas import (
    CreateScheduleTemplateModel,
    PatchScheduleTemplateModel
)


class ScheduleTemplateUseCase:
    def __init__(
        self,
        session: AsyncSession,
        schedule_template_repository: ScheduleTemplateRepository) -> None:

        self._session = session
        self._schedule_template_respository = schedule_template_repository

    async def create_template(
            self,
            user_id: int,
            template_data: CreateScheduleTemplateModel
        ) -> ScheduleTemplate | dict:

            template_exiting = await self._schedule_template_respository.get_by_id('123')

            new_template = await self._schedule_template_respository.create_template(
                user_id,
                template_data
            )

            try:
                await self._session.commit()
                return new_template
            except SQLAlchemyError as e:
                await self._session.rollback()
                logger.error('error', f'failed creating template, detail: {str(e)}')
                return {'status': 'failed creating template', 'detail': str(e)}

    async def update_template(
        self,
        template_id: int,
        user_id: int,
        updating_template_data: PatchScheduleTemplateModel
    ) -> ScheduleTemplate | dict:

        template_exiting = await self._session.scalar(
            select(ScheduleTemplate)
            .where(
                ScheduleTemplate.id == template_id,
                ScheduleTemplate.user_id == user_id,
                ScheduleTemplate.service_id == updating_template_data.service_id)
        )

        if not template_exiting:
            return {'status': 'failed creating template', 'detail': 'template not found'}

        updating_template = await self._schedule_template_respository.patch_update_template(
            template_id,
            updating_template_data
        )

        try:
            await self._session.commit()
            return updating_template
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error('error', f'failed updating template, detail: {str(e)}')
            return {'status': 'failed updating template', 'detail': str(e)}

    async def delete_template(
        self,
        template_id: int,
        user_id: int
    ) -> bool | dict:

        try:
            deleted = await self._schedule_template_respository.delete_template(
                template_id,
                user_id
            )
            if not deleted:
                return {'status': 'failed deleting template', 'detail': 'template not found'}
            await self._session.commit()
            return True
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error('error', f'failed deleting template: {str(e)}')
            return {'status': 'failed deleting template', 'detail': str(e)}


def get_schedule_template_use_case(
    session: AsyncSession = Depends(db_config.session),
    schedule_template_repository: ScheduleTemplateRepository = Depends(get_schedule_template_repository)
) -> ScheduleTemplateUseCase:

    return ScheduleTemplateUseCase(
        session, 
        schedule_template_repository)