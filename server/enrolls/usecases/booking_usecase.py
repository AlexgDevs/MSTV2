from datetime import datetime, date
from typing import List
import re

from dotenv.main import logger
from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
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

from ...payments.repositories import PaymentRepository, get_payment_repository
from ...common.utils.yookassa import (
    cancel_payment as yookassa_cancel_payment,
    create_refund as yookassa_create_refund,
    get_payment as yookassa_get_payment
)
from ...common.utils.logger import logger
from ...common.utils.email_config import email_verfification_obj


class BookingUseCase:
    def __init__(
            self,
            session: AsyncSession,
            enroll_repository: EnrollRepository,
            service_date_repository: ServiceDateRepository,
            payment_repository: PaymentRepository) -> None:

        self._session = session
        self._enroll_repository = enroll_repository
        self._service_date_repository = service_date_repository
        self._payment_repository = payment_repository
        self._slot_time_pattern = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")

    def _is_valid_slot_time_format(self, slot_time: str) -> bool:
        return bool(self._slot_time_pattern.match(slot_time))

    async def _check_slot_availability(
        self,
        service_date_id: int,
        slot_time: str
    ) -> bool:
        if not self._is_valid_slot_time_format(slot_time):
            return False

        service_date = await self._service_date_repository.get_by_id(service_date_id)
        if not service_date:
            return False

        if slot_time not in service_date.slots:
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
        try:
            if not self._is_valid_slot_time_format(enroll_data.slot_time):
                return {'status': 'failed creating enroll', 'detail': 'invalid slot time'}

            async with self._session.begin():
                date_row = await self._session.scalar(
                    select(ServiceDate)
                    .where(ServiceDate.id == enroll_data.service_date_id)
                    .with_for_update()
                )
                if not date_row:
                    return {'status': 'failed creating enroll', 'detail': 'date not found'}

                if enroll_data.slot_time not in date_row.slots:
                    return {'status': 'failed creating enroll', 'detail': 'slot not found'}

                service = await self._session.scalar(
                    select(Service).where(Service.id == enroll_data.service_id)
                )
                if not service:
                    return {'status': 'failed creating enroll', 'detail': 'service not found'}
                if service.id != date_row.service_id:
                    return {'status': 'failed creating enroll', 'detail': 'date does not belong to service'}
                slot_price = service.price

                if await self._check_date_expire(date_row):
                    return {'status': 'failed creating enroll', 'detail': 'date expired'}

                slot_status = date_row.slots.get(enroll_data.slot_time)
                if slot_status != 'available':
                    return {'status': 'failed creating enroll', 'detail': 'slot not available'}

                existing = await self._enroll_repository.get_by_slot_service_date_user_id(
                    enroll_data.service_date_id, user_id, enroll_data.slot_time
                )

                booked_enroll = None

                if existing and existing.status == 'cancelled':
                    booked_enroll = await self._session.merge(ServiceEnroll(
                        id=existing.id,
                        status='pending',
                        price=slot_price
                    ))
                elif existing:
                    return {'status': 'failed creating enroll', 'detail': 'user already booked this slot'}
                else:
                    booked_enroll = ServiceEnroll(
                        user_id=user_id,
                        service_id=enroll_data.service_id,
                        service_date_id=enroll_data.service_date_id,
                        slot_time=enroll_data.slot_time,
                        price=slot_price
                    )
                    self._session.add(booked_enroll)
                    await self._session.flush()

                new_slots = date_row.slots.copy()
                new_slots[enroll_data.slot_time] = 'booked'
                await self._session.merge(
                    ServiceDate(
                        id=enroll_data.service_date_id,
                        slots=new_slots))

                return booked_enroll

        except IntegrityError:
            await self._session.rollback()
            return {'status': 'failed creating enroll', 'detail': 'slot already booked'}
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error(
                'error', f'failed creating enroll, detail: {str(e)}')
            return {'status': 'failed creating enroll', 'detail': str(e)}

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
        action: str,
        reason: str | None = None
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

            # Отправляем письмо пользователю с причиной отмены
            if reason:
                try:
                    user = await self._session.scalar(
                        select(User).where(User.id == enroll.user_id)
                    )
                    if user and user.email:
                        master = await self._session.scalar(
                            select(User).where(User.id == service_owner_id)
                        )
                        master_name = master.name if master else 'Мастер'

                        email_verfification_obj.send_cancel_enroll_message(
                            to_email=user.email,
                            service_title=service.title,
                            master_name=master_name,
                            reason=reason
                        )
                        logger.info(
                            f'Cancel email sent to {user.email} for enroll #{enroll_id}')
                except Exception as e:
                    logger.error(f'Error sending cancel email: {str(e)}')

            date = await self._service_date_repository.get_by_id(enroll.service_date_id)
            if date:
                new_slots = date.slots.copy()
                new_slots[enroll.slot_time] = 'available'
                await self._session.merge(ServiceDate(id=enroll.service_date_id, slots=new_slots))

            payment = await self._payment_repository.get_by_enroll_id(enroll_id)
            if payment and payment.yookassa_payment_id:
                try:
                    yookassa_payment = await yookassa_get_payment(payment.yookassa_payment_id)
                    yookassa_status = yookassa_payment.get('status')

                    if yookassa_status == 'succeeded':
                        try:
                            refund_result = await yookassa_create_refund(
                                payment_id=payment.yookassa_payment_id,
                                amount=payment.amount,
                                description=f'Refund for canceled enroll #{enroll_id}'
                            )

                            await self._payment_repository.update_payment(
                                payment_id=payment.id,
                                yookassa_status='succeeded',
                                status='canceled'
                            )
                            logger.info(
                                f'Refund created for payment {payment.yookassa_payment_id}, '
                                f'refund_id: {refund_result.get("id")}'
                            )
                        except Exception as e:
                            logger.error(
                                f'Error creating refund for payment {payment.yookassa_payment_id}: {str(e)}'
                            )

                    elif yookassa_status == 'waiting_for_capture':
                        try:
                            cancel_result = await yookassa_cancel_payment(payment.yookassa_payment_id)
                            await self._payment_repository.update_payment(
                                payment_id=payment.id,
                                yookassa_status=cancel_result.get(
                                    'status', 'canceled'),
                                status='canceled'
                            )
                            logger.info(
                                f'Payment {payment.yookassa_payment_id} canceled')
                        except Exception as e:
                            logger.error(
                                f'Error canceling payment {payment.yookassa_payment_id}: {str(e)}')

                    else:
                        await self._payment_repository.update_payment(
                            payment_id=payment.id,
                            status='canceled'
                        )
                        logger.info(
                            f'Payment {payment.yookassa_payment_id} marked as canceled (status: {yookassa_status})')

                except Exception as e:
                    logger.error(
                        f'Error processing refund for payment {payment.yookassa_payment_id}: {str(e)}'
                    )
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
        get_service_date_repository),
    payment_repository: PaymentRepository = Depends(get_payment_repository)
) -> BookingUseCase:
    return BookingUseCase(
        session,
        enroll_repository,
        service_date_repository,
        payment_repository
    )
