import ast
from decimal import Decimal
import uuid
from asyncio import create_task
from datetime import datetime
from typing import Dict, Any
from os import getenv

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select

from ...common import db_config
from ...common.db.models.service import ServiceEnroll, Service
from ...common.db.models.payment import Payment
from ...common.utils.logger import logger
from ...common.utils.yookassa import (
    process_payment_with_deal as yookassa_create_payment_with_deal,
    get_payment as yookassa_get_payment,
    capture_payment as yookassa_capture_payment,
    cancel_payment as yookassa_cancel_payment,
    process_deal_closure as yookassa_process_deal_closure,
    aggregate_amount as yookassa_aggregate_amount,
)
from ..repositories import PaymentRepository, get_payment_repository
from ..schemas import CreatePaymentModel


DEMO_PAYMENTS_ENABLED = getenv("DEMO_PAYMENTS_ENABLED", "false").lower() in (
    "1",
    "true",
    "yes",
)


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
                select(Service).where(Service.id == enroll.service_id)
            )

            if not service:
                return {
                    'status': 'error',
                    'detail': 'service not found'
                }

            idempotence_key = str(uuid.uuid4())
            description = f"Enroll #{payment_data.enroll_id}"

            # Общий расчёт сумм для мастера и платформы
            aggregated = await yookassa_aggregate_amount(float(enroll.price))
            seller_amount = float(aggregated.get("seller_amount", 0))

            # DEMO-РЕЖИМ: не вызываем YooKassa, эмулируем успешный платёж
            if DEMO_PAYMENTS_ENABLED:
                payment_metadata = {
                    "yookassa_metadata": {
                        "emulated": True,
                        "idempotence_key": idempotence_key,
                    },
                    "deal_id": None,
                    "deal_status": "opened",
                    "seller_amount": seller_amount,
                    "platform_fee": aggregated.get("platform_amount"),
                    "seller_id": service.user_id,
                }

                payment = await self._payment_repository.create_payment(
                    enroll_id=payment_data.enroll_id,
                    amount=enroll.price,
                    yookassa_payment_id=None,
                    yookassa_status="succeeded",
                    description=description,
                    confirmation_url=None,
                    payment_metadata=str(payment_metadata),
                )

                payment.status = "succeeded"
                await self._apply_payment_succeeded_effects(payment)
                await self._session.commit()

                return {
                    "status": "success",
                    "payment_id": payment.id,
                    "confirmation_url": payment.confirmation_url,
                    "yookassa_payment_id": payment.yookassa_payment_id,
                }

            # PROD/TEST-РЕЖИМ: реальный вызов YooKassa
            yookassa_result = await yookassa_create_payment_with_deal(
                amount=enroll.price,
                description=description,
                return_url=return_url,
                seller_amount=seller_amount,
                metadata={
                    "enroll_id": str(payment_data.enroll_id),
                    "user_id": str(user_id),
                    "seller_id": str(service.user_id),
                    "idempotence_key": idempotence_key,
                },
                capture=False,
            )

            yookassa_payment = yookassa_result.get("payment", {})
            yookassa_deal = yookassa_result.get("deal", {})

            payment_metadata = {
                "yookassa_metadata": yookassa_payment.get("metadata", {}),
                "deal_id": yookassa_deal.get("id"),
                "deal_status": yookassa_deal.get("status"),
                "seller_amount": seller_amount,
                "platform_fee": aggregated.get("platform_amount"),
            }

            payment = await self._payment_repository.create_payment(
                enroll_id=payment_data.enroll_id,
                amount=enroll.price,
                yookassa_payment_id=yookassa_payment.get("id"),
                yookassa_status=yookassa_payment.get("status"),
                description=description,
                confirmation_url=yookassa_payment.get("confirmation", {}).get(
                    "confirmation_url"
                ),
                payment_metadata=str(payment_metadata),
            )

            enroll.status = "pending"
            await self._session.commit()

            return {
                "status": "success",
                "payment_id": payment.id,
                "confirmation_url": payment.confirmation_url,
                "yookassa_payment_id": payment.yookassa_payment_id,
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

    async def confirm_completion(self, enroll_id: int, user_id: int) -> Dict[str, Any]:
        """
        Метод для КЛИЕНТА: подтверждение, что услуга оказана.
        Переводит деньги из frozen_balance в balance.
        """
        try:
            # 1. Ищем платеж
            payment = await self._payment_repository.get_by_enroll_id(enroll_id)
            if not payment:
                return {"status": "error", "detail": "Payment not found"}

            # 2. Проверка прав (только клиент может подтвердить)
            if payment.enroll.user_id != user_id:
                return {"status": "error", "detail": "Access denied"}

            # В демо-режиме достаточно, чтобы платёж не был отменён/не упал
            if payment.status not in ("succeeded", "pending", "processing"):
                return {
                    "status": "error",
                    "detail": f"Payment not in confirmable status: {payment.status}",
                }

            # 3. Достаем цифры из метаданных и переносим деньги из frozen в основной баланс,
            #    но не ломаем флоу, если аккаунта мастера или замороженных средств нет.
            meta = ast.literal_eval(payment.payment_metadata or "{}")
            seller_id = int(meta.get("seller_id", 0)) if meta.get("seller_id") else None
            seller_amount = Decimal(str(meta.get("seller_amount", 0)))

            seller = None
            if seller_id:
                seller = await self._payment_repository.get_seller_id(seller_id)

            if seller and seller.account:
                amount_to_release = min(seller.account.frozen_balance, seller_amount)
                if amount_to_release > 0:
                    seller.account.frozen_balance -= amount_to_release
                    seller.account.balance += amount_to_release
            else:
                logger.warning("Seller account not found during confirm_completion")

            # Финальный статус платежа и записи в системе
            payment.status = "closed"
            payment.enroll.status = "completed"

            await self._session.commit()
            return {"status": "success"}

        except Exception as e:
            await self._session.rollback()
            logger.error(f"Confirm error: {str(e)}")
            return {"status": "error", "detail": str(e)}

    async def handle_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            event = webhook_data.get('event')
            payment_object = webhook_data.get('object', {})
            yookassa_payment_id = payment_object.get('id')

            if not yookassa_payment_id:
                return {'status': 'error', 'detail': 'payment ID not found'}

            payment = await self._payment_repository.get_by_yookassa_id(yookassa_payment_id)
            if not payment:
                return {'status': 'error', 'detail': 'Payment not found'}

            yookassa_status = payment_object.get('status')
            paid_at = payment_object.get('paid_at')
            status = payment.status

            # Логика обработки статусов
            if yookassa_status == 'succeeded':
                status = 'succeeded'
            elif yookassa_status == 'canceled':
                status = 'canceled'
            elif yookassa_status == 'waiting_for_capture':
                # Твоя логика авто-захвата платежа
                try:
                    capture_result = await yookassa_capture_payment(yookassa_payment_id)
                    yookassa_status = capture_result.get('status', yookassa_status)
                    paid_at = capture_result.get('paid_at')
                    status = 'succeeded'
                except Exception as e:
                    logger.error(f'Capture failed: {str(e)}')

            # ОБНОВЛЯЕМ ПЛАТЕЖ
            await self._payment_repository.update_payment(
                payment_id=payment.id,
                yookassa_status=yookassa_status,
                status=status,
                paid_at=paid_at,
            )

            # --- ИНТЕГРАЦИЯ БАЛАНСА (ЗАМОРОЗКА) ---
            if status == "succeeded":
                await self._apply_payment_succeeded_effects(payment)

            await self._session.commit()
            return {"status": "success"}

        except Exception as e:
            await self._session.rollback()
            logger.error(f"Webhook error: {str(e)}")
            return {"status": "error", "detail": str(e)}

    async def _apply_payment_succeeded_effects(self, payment: Payment) -> None:
        """
        Общая логика для успешного платежа:
        - помечаем запись как 'paid'
        - замораживаем деньги на аккаунте мастера (frozen_balance)
        Используется как в вебхуке YooKassa, так и в демо-режиме.
        """
        # 1. Обновляем статус записи (Enroll)
        enroll = await self._session.scalar(
            select(ServiceEnroll).where(ServiceEnroll.id == payment.enroll_id)
        )
        if enroll:
            enroll.status = "paid"  # Работа оплачена, деньги в холде

        # 2. Замораживаем деньги на аккаунте мастера
        try:
            meta = ast.literal_eval(payment.payment_metadata or "{}")
            seller_id = int(meta.get("seller_id"))
            seller_amount = Decimal(str(meta.get("seller_amount", 0)))

            seller = await self._payment_repository.get_seller_id(seller_id)
            if seller and seller.account:
                seller.account.frozen_balance += seller_amount
                logger.info(f"Frozen {seller_amount} for master {seller_id}")
        except Exception as e:
            logger.error(f"Error during balance freezing: {e}")
    # async def handle_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
    #     try:
    #         event = webhook_data.get('event')
    #         payment_object = webhook_data.get('object', {})
    #         yookassa_payment_id = payment_object.get('id')

    #         if not yookassa_payment_id:
    #             return {
    #                 'status': 'error',
    #                 'detail': 'payment ID in webhook not found'
    #             }

    #         payment = await self._payment_repository.get_by_yookassa_id(
    #             yookassa_payment_id
    #         )

    #         if not payment:
    #             logger.warning(
    #                 f'Payment {yookassa_payment_id} not found in db')
    #             return {
    #                 'status': 'error',
    #                 'detail': 'Payment  not found'
    #             }

    #         yookassa_status = payment_object.get('status')
    #         paid_at = payment_object.get('paid_at')

    #         status = payment.status
    #         if yookassa_status == 'succeeded':
    #             status = 'succeeded'
    #         elif yookassa_status == 'canceled':
    #             status = 'canceled'
    #         elif yookassa_status == 'waiting_for_capture':
    #             status = 'processing'
    #             try:
    #                 logger.info(
    #                     f'Auto-capturing payment {yookassa_payment_id} after payment')
    #                 capture_result = await yookassa_capture_payment(yookassa_payment_id)
    #                 yookassa_status = capture_result.get(
    #                     'status', yookassa_status)
    #                 if capture_result.get('paid_at'):
    #                     paid_at = capture_result.get('paid_at')
    #                 status = 'succeeded'
    #                 logger.info(
    #                     f'Payment {yookassa_payment_id} captured successfully')
    #             except Exception as e:
    #                 logger.error(
    #                     f'Failed to auto-capture payment {yookassa_payment_id}: {str(e)}')

    #         await self._payment_repository.update_payment(
    #             payment_id=payment.id,
    #             yookassa_status=yookassa_status,
    #             status=status,
    #             paid_at=paid_at
    #         )

    #         if status == 'succeeded' and payment.enroll_id:
    #             enroll = await self._session.scalar(
    #                 select(ServiceEnroll)
    #                 .where(ServiceEnroll.id == payment.enroll_id)
    #             )
    #             if enroll:
    #                 if enroll.status == 'waiting_payment':
    #                     enroll.status = 'pending'
    #                     await self._session.flush()

    #                     if enroll.service_date_id:
    #                         from ...common.db import ServiceDate
    #                         service_date = await self._session.scalar(
    #                             select(ServiceDate)
    #                             .where(ServiceDate.id == enroll.service_date_id)
    #                         )
    #                         if service_date and service_date.slots:
    #                             new_slots = service_date.slots.copy()
    #                             if enroll.slot_time in new_slots:
    #                                 new_slots[enroll.slot_time] = 'booked'
    #                                 await self._session.merge(
    #                                     ServiceDate(
    #                                         id=enroll.service_date_id,
    #                                         slots=new_slots
    #                                     )
    #                                 )
    #                                 await self._session.flush()

    #         await self._session.commit()

    #         return {
    #             'status': 'success',
    #             'payment_id': payment.id,
    #             'enroll_id': payment.enroll_id
    #         }

    #     except SQLAlchemyError as e:
    #         await self._session.rollback()
    #         logger.error(f'Webhook database error: {str(e)}')
    #         return {
    #             'status': 'error',
    #             'detail': f'Database error: {str(e)}'
    #         }
    #     except Exception as e:
    #         await self._session.rollback()
    #         logger.error(f'Unexpected webhook error: {str(e)}')
    #         return {
    #             'status': 'error',
    #             'detail': f'Webhook processing error: {str(e)}'
    #         }

    async def _background_process_deal_closure(self, yookassa_payment_id):
        """
        Закрытие сделки в фоновом режиме после подтверждения клиентом
        При закрытии сделки автоматически распределяются средства:
        - Продавцу переводится его доля
        - Платформе начисляется комиссия (10%)
        """
        try:
            result = await yookassa_process_deal_closure(yookassa_payment_id)
            if result.get('success'):
                logger.info(
                    f"Successfully closed deal for payment {yookassa_payment_id}")
            else:
                logger.error(
                    f"Failed to close deal for payment {yookassa_payment_id}: {result.get('error')}")
        except Exception as e:
            logger.error(
                f"Error closing deal for payment {yookassa_payment_id}: {str(e)}")

    async def process_payout_for_completed_enroll(self, enroll_id: int) -> Dict[str, Any]:
        """
        Запускает оркестратор для распределения средств после подтверждения клиентом
        Вызывается когда enroll.status становится 'completed'
        """
        try:
            payment = await self._payment_repository.get_by_enroll_id(enroll_id)
            if not payment:
                return {
                    'status': 'error',
                    'detail': 'Payment not found for this enroll'
                }

            if not payment.yookassa_payment_id:
                return {
                    'status': 'error',
                    'detail': 'YooKassa payment ID not found'
                }

            yookassa_payment = await yookassa_get_payment(payment.yookassa_payment_id)
            yookassa_status = yookassa_payment.get('status')

            if yookassa_status == 'waiting_for_capture':
                logger.info(
                    f'Capturing payment {payment.yookassa_payment_id} for enroll {enroll_id}')
                try:
                    capture_result = await yookassa_capture_payment(payment.yookassa_payment_id)
                    logger.info(
                        f'Payment {payment.yookassa_payment_id} captured successfully')

                    await self._payment_repository.update_payment(
                        payment_id=payment.id,
                        yookassa_status=capture_result.get(
                            'status', 'succeeded'),
                        status='succeeded',
                        paid_at=capture_result.get('paid_at')
                    )
                    await self._session.commit()
                except Exception as e:
                    logger.error(
                        f'Failed to capture payment {payment.yookassa_payment_id}: {str(e)}')
                    return {
                        'status': 'error',
                        'detail': f'Failed to capture payment: {str(e)}'
                    }
            elif yookassa_status != 'succeeded':
                return {
                    'status': 'error',
                    'detail': f'Payment not succeeded, current status: {yookassa_status}'
                }

            create_task(self._background_process_deal_closure(
                payment.yookassa_payment_id))

            return {
                'status': 'success',
                'message': 'Deal closure process started. Funds will be distributed automatically.'
            }

        except Exception as e:
            logger.error(
                f'Error processing payout for enroll {enroll_id}: {str(e)}')
            return {
                'status': 'error',
                'detail': f'Error: {str(e)}'
            }

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
