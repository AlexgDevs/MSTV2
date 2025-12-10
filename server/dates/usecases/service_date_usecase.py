from datetime import timedelta, datetime, date
from time import strptime
from typing import List, Dict

from dotenv.main import logger
from fastapi import Depends
from sqlalchemy import update
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
    ServiceDate,
    ScheduleTemplate
)

from ...scheduletemplates.repositories import (
    get_schedule_template_repository,
    ScheduleTemplateRepository,
    schedule_template_repository_exemplar
)

from ..repositories import (
    ServiceDateRepository,
    get_service_date_repository,
    service_date_repository_exemplar
)

from ..schemas import CreateServiceDate


class ServiceDateUseCase:
    def __init__(
            self,
            session: AsyncSession,
            service_date_repository: ServiceDateRepository) -> None:

        self._session = session
        self._service_date_repo = service_date_repository

    async def create_service_date(
        self,
        user_id: int,
        service_date_data: CreateServiceDate
    ) -> ServiceDate | dict:

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
            logger.error(
                'error', f'failed creating service date, detail: {str(e)}')
            return {'status': 'failed creating service date', 'detail': str(e)}

    async def _check_date_exipire(self, date_obj: ServiceDate):
        if isinstance(date_obj, ServiceDate):
            if isinstance(date_obj.date, str):
                try:
                    service_date = datetime.strptime(
                        date_obj.date, "%d-%m-%Y").date()
                except ValueError:
                    try:
                        service_date = datetime.strptime(
                            date_obj.date, "%Y-%m-%d").date()
                    except ValueError:
                        return False
                return service_date < date.today()

        return False

    async def expire_all_dates_slots(self) -> dict:
        try:
            all_dates = await self._service_date_repo.get_all()
            expired_dates = []

            for date_obj in all_dates:
                if await self._check_date_exipire(date_obj):
                    updated_slots = {
                        time: 'break' for time in date_obj.slots.keys()
                    }
                    expired_dates.append({
                        'id': date_obj.id,
                        'slots': updated_slots
                    })

            if expired_dates:
                for expired_date in expired_dates:
                    stmt = (
                        update(ServiceDate)
                        .where(ServiceDate.id == expired_date['id'])
                        .values(slots=expired_date['slots'])
                    )
                    await self._session.execute(stmt)

                await self._session.commit()

                return {
                    'status': 'success',
                    'expired_dates_count': len(expired_dates),
                    'expired_ids': [d['id'] for d in expired_dates]
                }

            return {
                'status': 'success',
                'expired_dates_count': 0,
                'message': 'No expired dates found'
            }

        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error(
                'error', f'failed expiring dates slots, detail: {str(e)}')
            return {'status': 'failed', 'detail': str(e)}

    async def check_all_dates_slots_at_expire(self):
        dates = await self._service_date_repo.get_all()
        date_meta = {}
        expired_count = 0

        for date_obj in dates:
            if await self._check_date_exipire(date_obj):
                expired_count += 1
                date_meta['expire'] = str(date_obj.service_id)

        return {
            'expired_count': expired_count,
            'meta': date_meta
        }


class DatesInteractionTemplates:
    def __init__(
        self,
        session: AsyncSession,
        service_date_repository: ServiceDateRepository,
        schedule_template_repository: ScheduleTemplateRepository
    ) -> None:

        self._session = session
        self._service_date_repository = service_date_repository
        self._schedule_template_respository = schedule_template_repository

    def _get_week_dates(self, start_date: datetime) -> Dict[str, str]:
        week_dates = {}
        for i in range(7):
            current_date = start_date + timedelta(days=i)
            day_name = current_date.strftime("%A").lower()
            date_str = current_date.strftime("%d-%m-%Y")
            week_dates[day_name] = date_str
        return week_dates

    def _get_next_sunday(self) -> datetime:
        today = datetime.now().date()
        days_until_sunday = (6 - today.weekday()) % 7
        next_sunday = today + timedelta(days=days_until_sunday)
        return datetime.combine(next_sunday, datetime.min.time())

    async def generate_schedule(self):
        templates = await self._schedule_template_respository.get_all()

        next_sunday = self._get_next_sunday()
        week_dates = self._get_week_dates(next_sunday)

        completed_templates = []
        failed = 0

        for template in templates:
            if not template.is_active:
                continue

            try:
                new_date = await self._create_date_with_template(
                    template,
                    week_dates.get(template.day)
                )
                await self._session.commit()
                completed_templates.append(new_date)
            except SQLAlchemyError as e:
                await self._session.rollback()
                failed += 1
                logger.error(
                    'error', f'failed creating date with template, detail: {str(e)}')
                continue

        return {'status': 'created', 'success': len(completed_templates), 'failed': failed}

    async def _create_date_with_template(
        self,
        template: ScheduleTemplate,
        target_date: str
    ):

        date_model = CreateServiceDate(
            date=target_date,
            slots=template.hours_work,
            service_id=template.service_id
        )

        try:
            new_date = await self._service_date_repository.create_date(
                date_model
            )
            await self._session.commit()
            return new_date
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error(
                'error', f'failed creating service date, detail: {str(e)}')
            return None


service_date_usecase_exemplar: ServiceDateUseCase = ServiceDateUseCase(
    db_config.session,
    service_date_repository_exemplar)


dates_interaction_templates_exemplar = DatesInteractionTemplates(
    db_config.session,
    service_date_repository_exemplar,
    schedule_template_repository_exemplar
)


def get_service_date_use_case(
    session: AsyncSession = Depends(db_config.session),
    service_date_repository: ServiceDateRepository = Depends(
        get_service_date_repository)
) -> ServiceDateUseCase:
    return ServiceDateUseCase(
        session,
        service_date_repository
    )
