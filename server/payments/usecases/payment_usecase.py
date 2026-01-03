import uuid
from asyncio import create_task
from datetime import datetime
from typing import Dict, Any
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select

from ...common import db_config, Service
from ...common.db.models.service import ServiceEnroll
from ...common.db.models.payment import Payment
from ...common.utils.logger import logger
from ...common.utils.yookassa import (
    create_payment as yookassa_create_payment,
    get_payment as yookassa_get_payment,
    capture_payment as yookassa_capture_payment,
    cancel_payment as yookassa_cancel_payment,
    trafic_orchestrator as yookass_trafic_orchestrator
)
from ..repositories import PaymentRepository, get_payment_repository
from ..schemas import CreatePaymentModel


class PaymentUseCase:
    def __init__(
        self,
        session: AsyncSession,
        payment_repository: PaymentRepository
    ) -> None:
        self._session = session
        self._payment_repository = payment_repository

    async def create_payment(
        self,
        user_id: int,
        payment_data: CreatePaymentModel,
        return_url: str
    ) -> Dict[str, Any]:
        try:
            enroll = await self._session.scalar(
                select(ServiceEnroll)
                .where(
                    ServiceEnroll.id == payment_data.enroll_id,
                    ServiceEnroll.user_id == user_id
                )
            )

            if not enroll:
                return {
                    'status': 'error',
                    'detail': 'enroll not found'
                }

            existing_payment = await self._payment_repository.get_by_enroll_id(
                payment_data.enroll_id
            )

            if existing_payment:
                if existing_payment.status == 'succeeded':
                    return {
                        'status': 'error',
                        'detail': 'payment already succeeded'
                    }
                elif existing_payment.status == 'pending' or existing_payment.status == 'processing':
                    return {
                        'status': 'success',
                        'payment_id': existing_payment.id,
                        'confirmation_url': existing_payment.confirmation_url,
                        'yookassa_payment_id': existing_payment.yookassa_payment_id
                    }

            service = await self._session.scalar(
                select(Service)
                .where(Service.id == enroll.service_id)
            )

            if not service:
                return {
                    'status': 'error',
                    'detail': 'service not found'
                }

            idempotence_key = str(uuid.uuid4())
            description = f"Enroll #{payment_data.enroll_id}"

            yookassa_response = await yookassa_create_payment(
                amount=enroll.price,
                description=description,
                return_url=return_url,
                metadata={
                    'enroll_id': str(payment_data.enroll_id),
                    'user_id': str(user_id),
                    'seller_id': str(service.user_id),
                    'idempotence_key': idempotence_key
                },
                capture=False
            )

            payment = await self._payment_repository.create_payment(
                enroll_id=payment_data.enroll_id,
                amount=enroll.price,
                yookassa_payment_id=yookassa_response.get('id'),
                yookassa_status=yookassa_response.get('status'),
                description=description,
                confirmation_url=yookassa_response.get(
                    'confirmation', {}).get('confirmation_url'),
                payment_metadata=str(yookassa_response.get('metadata', {}))
            )

            await self._session.commit()

            return {
                'status': 'success',
                'payment_id': payment.id,
                'confirmation_url': payment.confirmation_url,
                'yookassa_payment_id': payment.yookassa_payment_id
            }

        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error(f'Payment database error: {str(e)}')
            return {
                'status': 'error',
                'detail': f'Database error: {str(e)}'
            }

        except Exception as e:
            await self._session.rollback()
            logger.error(f'Unexpected payment error: {str(e)}')
            return {
                'status': 'error',
                'detail': f'Payment creation error: {str(e)}'
            }

    async def handle_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            event = webhook_data.get('event')
            payment_object = webhook_data.get('object', {})
            yookassa_payment_id = payment_object.get('id')

            if not yookassa_payment_id:
                return {
                    'status': 'error',
                    'detail': 'payment ID in webhook not found'
                }

            payment = await self._payment_repository.get_by_yookassa_id(
                yookassa_payment_id
            )

            if not payment:
                logger.warning(
                    f'Payment {yookassa_payment_id} not found in db')
                return {
                    'status': 'error',
                    'detail': 'Payment  not found'
                }

            yookassa_status = payment_object.get('status')
            paid_at = payment_object.get('paid_at')

            status = payment.status
            if yookassa_status == 'succeeded':
                status = 'succeeded'
            elif yookassa_status == 'canceled':
                status = 'canceled'
            elif yookassa_status == 'waiting_for_capture':
                status = 'processing'

            await self._payment_repository.update_payment(
                payment_id=payment.id,
                yookassa_status=yookassa_status,
                status=status,
                paid_at=paid_at
            )

            if status == 'succeeded' and payment.enroll_id:
                create_task(self._background_process_successful_payment(yookassa_payment_id))
                enroll = await self._session.scalar(
                    select(ServiceEnroll)
                    .where(ServiceEnroll.id == payment.enroll_id)
                )
                if enroll and enroll.status == 'pending':
                    enroll.status = 'confirmed'
                    await self._session.flush()

            await self._session.commit()

            return {
                'status': 'success',
                'payment_id': payment.id,
                'enroll_id': payment.enroll_id
            }

        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error(f'Webhook database error: {str(e)}')
            return {
                'status': 'error',
                'detail': f'Database error: {str(e)}'
            }
        except Exception as e:
            await self._session.rollback()
            logger.error(f'Unexpected webhook error: {str(e)}')
            return {
                'status': 'error',
                'detail': f'Webhook processing error: {str(e)}'
            }
    async def _background_process_successful_payment(self, yookassa_payment_id):
        try:
            await yookass_trafic_orchestrator(yookassa_payment_id)
            logger.info(f"Successfully processed payment {yookassa_payment_id}")
        except Exception as e:
            logger.error(f"Error processing payment {yookassa_payment_id}: {str(e)}")

    async def get_payment_status(
        self,
        payment_id: int,
        user_id: int
    ) -> Dict[str, Any]:
        try:
            payment = await self._payment_repository.get_by_id(payment_id)

            if not payment:
                return {
                    'status': 'error',
                    'detail': 'Payment not found'
                }

            if payment.enroll and payment.enroll.user_id != user_id:
                return {
                    'status': 'error',
                    'detail': 'Access denied to this payment'
                }

            return {
                'status': 'success',
                'payment': {
                    'id': payment.id,
                    'status': payment.status,
                    'yookassa_status': payment.yookassa_status,
                    'confirmation_url': payment.confirmation_url,
                    'paid_at': payment.paid_at.isoformat() if payment.paid_at else None
                }
            }

        except Exception as e:
            logger.error(f'Payment status error: {str(e)}')
            return {
                'status': 'error',
                'detail': f'Error: {str(e)}'
            }

    async def get_user_payments(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        try:
            payments = await self._payment_repository.get_by_user_id(
                user_id=user_id,
                limit=limit,
                offset=offset
            )

            payments_data = []
            for payment in payments:
                service_info = None
                enroll_date = None
                enroll_time = None

                if payment.enroll:
                    enroll_time = payment.enroll.slot_time

                    if payment.enroll.service_date:
                        enroll_date = payment.enroll.service_date.date

                    if payment.enroll.service:
                        master_name = None
                        if payment.enroll.service.user:
                            master_name = payment.enroll.service.user.name

                        service_info = {
                            'id': payment.enroll.service.id,
                            'title': payment.enroll.service.title,
                            'description': payment.enroll.service.description,
                            'master_name': master_name
                        }

                payments_data.append({
                    'id': payment.id,
                    'enroll_id': payment.enroll_id,
                    'amount': payment.amount,
                    'currency': payment.currency,
                    'status': payment.status,
                    'yookassa_status': payment.yookassa_status,
                    'description': payment.description,
                    'confirmation_url': payment.confirmation_url,
                    'created_at': payment.created_at.isoformat(),
                    'paid_at': payment.paid_at.isoformat() if payment.paid_at else None,
                    'service': service_info,
                    'enroll_date': enroll_date,
                    'enroll_time': enroll_time
                })

            return {
                'status': 'success',
                'payments': payments_data,
                'total': len(payments_data)
            }

        except Exception as e:
            logger.error(f'Get user payments error: {str(e)}')
            return {
                'status': 'error',
                'detail': f'Error: {str(e)}'
            }


def get_payment_usecase(
    session: AsyncSession = Depends(db_config.session),
    payment_repository: PaymentRepository = Depends(get_payment_repository)
) -> PaymentUseCase:
    return PaymentUseCase(session, payment_repository)
