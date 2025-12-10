from datetime import datetime, date
from typing import List

from dotenv.main import logger
from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import session

from ..repositories import (
    get_enroll_repository,
    EnrollRepository
)

from ..schemas import CreateEnrollModel

from ...common.db import (
    AsyncSession,
    User,
    db_config,
    joinedload,
    select,
    selectinload,
    ServiceEnroll,
    ServiceDate,
    Service
)

from ...dates.repositories import (
    get_service_date_repository,
    ServiceDateRepository
)


class BookingUseCase:
    def __init__(
            self,
            session: AsyncSession,
            enroll_repository: EnrollRepository,
            service_date_repository: ServiceDateRepository) -> None:

        self._session = session
        self._enroll_repository = enroll_repository
        self._service_date_repository = service_date_repository

    async def _check_slot_availability(
        self,
        service_date_id: int,
        slot_time: str
    ) -> bool:
        service_date = await self._service_date_repository.get_by_id(service_date_id)
        if not service_date:
            return False

        slot_status = service_date.slots.get(slot_time)

        if slot_status != 'available':
            return False

        if await self._check_date_expire(service_date):
            return False

        return True

    async def _check_user_booking(
        self,
        user_id: int,
        service_date_id: int,
        slot_time: str
    ) -> bool:
        existing = await self._enroll_repository.get_by_slot_service_date_user_id(
            service_date_id, user_id, slot_time
        )
        return existing is not None

    async def can_book_slot(
        self,
        user_id: int,
        service_date_id: int,
        slot_time: str
    ) -> bool:
        return (
            await self._check_slot_availability(service_date_id, slot_time) and
            not await self._check_user_booking(user_id, service_date_id, slot_time)
        )

    async def create_book(
        self,
        user_id: int,
        enroll_data: CreateEnrollModel
    ):

        existing = await self._enroll_repository.get_by_slot_service_date_user_id(
            enroll_data.service_date_id, user_id, enroll_data.slot_time)

        if existing and existing.status == 'cancelled':
            if await self._check_slot_availability(enroll_data.service_date_id, enroll_data.slot_time):
                await self._session.merge(ServiceEnroll(
                    id=existing.id,
                    status='pending',
                    price=enroll_data.price
                ))
                await self._session.commit()

                date = await self._service_date_repository.get_by_id(enroll_data.service_date_id)
                new_slots = date.slots.copy()
                new_slots[enroll_data.slot_time] = 'booked'
                await self._session.merge(ServiceDate(id=enroll_data.service_date_id, slots=new_slots))
                await self._session.commit()
                return date

        if await self.can_book_slot(
            user_id,
            enroll_data.service_date_id,
            enroll_data.slot_time
        ):
            date = await self._service_date_repository.get_by_id(
                enroll_data.service_date_id
            )

            if date:
                try:
                    new_enroll = await self._enroll_repository.create_enroll(
                        user_id,
                        enroll_data
                    )

                    self._session.add(new_enroll)
                    await self._session.commit()
                except SQLAlchemyError as e:
                    await self._session.rollback()
                    logger.error(
                        'error', f'failed creating enroll, detail: {str(e)}')
                    return {'status': 'failed creating enroll', 'detail': str(e)}

                new_slots = date.slots.copy()
                new_slots[enroll_data.slot_time] = 'booked'
                await self._session.merge(
                    ServiceDate(
                        id=enroll_data.service_date_id,
                        slots=new_slots))
                await self._session.commit()
                return new_enroll
            return {'status': 'failed creating enroll', 'detail': 'date not found'}
        return {'status': 'failed creating enroll', 'detail': 'date not available'}

    async def cancel_book(
            self,
            enroll_id: int,
            user_id: int
    ):
        exiting = await self._enroll_repository.get_by_enroll_user_id(
            enroll_id,
            user_id
        )

        if not exiting:
            return {'status': 'failed canceling enroll', 'detail': 'enroll not found'}

        if exiting.status == 'cancelled':
            return {'status': 'failed canceling enroll', 'detail': 'status alredy canceling'}

        if exiting:
            date = await self._service_date_repository.get_by_id(exiting.service_date_id)

            new_slots = date.slots.copy()
            new_slots[exiting.slot_time] = 'available'
            await self._session.merge(ServiceEnroll(id=enroll_id, status='cancelled'))
            await self._session.merge(ServiceDate(id=exiting.service_date_id, slots=new_slots))
            await self._session.commit()
            return exiting

        return {'status': 'failed canceling enroll', 'detail': 'date not found'}

    async def _check_date_expire(self, date_obj: ServiceDate) -> bool:
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

    async def _mark_status_break(self, date_obj: ServiceDate):
        update_date = {time: 'break' for time in date_obj.slots}
        await self._session.merge(ServiceDate(id=date_obj.id, slots=update_date))
        await self._session.commit()
        return update_date

    async def check_date_for_final_dates(self) -> list:
        update_list = []
        dates = await self._service_date_repository.get_all()
        for date in dates:
            if await self._check_date_expire(date):
                update_list.append(await self._mark_status_break(date))

        return update_list

    async def change_enroll_status(
        self,
        enroll_id: int,
        service_owner_id: int,
        action: str
    ):

        enroll = await self._enroll_repository.get_by_id(enroll_id)

        if not enroll:
            return {'status': 'failed', 'detail': 'enroll not found'}

        service = await self._session.scalar(
            select(Service).where(Service.id == enroll.service_id)
        )

        if not service:
            return {'status': 'failed', 'detail': 'service not found'}

        if service.user_id != service_owner_id:
            return {'status': 'failed', 'detail': 'permission denied'}

        if enroll.status != 'pending':
            return {'status': 'failed', 'detail': f'enroll status is {enroll.status}, only pending can be changed'}

        if action == 'accept':
            new_status = 'confirmed'
        elif action == 'reject':
            new_status = 'cancelled'

            date = await self._service_date_repository.get_by_id(enroll.service_date_id)
            if date:
                new_slots = date.slots.copy()
                new_slots[enroll.slot_time] = 'available'
                await self._session.merge(ServiceDate(id=enroll.service_date_id, slots=new_slots))
        else:
            return {'status': 'failed', 'detail': f'invalid action: {action}. Use "accept" or "reject"'}

        try:
            await self._session.merge(ServiceEnroll(id=enroll_id, status=new_status))
            await self._session.commit()
            updated_enroll = await self._enroll_repository.get_by_id(enroll_id)
            return updated_enroll
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error(
                'error', f'failed changing enroll status, detail: {str(e)}')
            return {'status': 'failed', 'detail': str(e)}


def get_booking_usecase(
    session: AsyncSession = Depends(db_config.session),
    enroll_repository: EnrollRepository = Depends(get_enroll_repository),
    service_date_repository: ServiceDateRepository = Depends(
        get_service_date_repository)
) -> BookingUseCase:
    return BookingUseCase(
        session,
        enroll_repository,
        service_date_repository
    )
