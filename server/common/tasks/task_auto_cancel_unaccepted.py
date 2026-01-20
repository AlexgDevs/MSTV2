import asyncio
from datetime import datetime, timedelta, timezone
from os import getenv

from . import app
from ...common.db import db_config
from ...enrolls.repositories import EnrollRepository
from ...dates.repositories import ServiceDateRepository
from ...payments.repositories import PaymentRepository
from ...common.utils.yookassa import (
    cancel_payment as yookassa_cancel_payment,
    create_refund as yookassa_create_refund,
    get_payment as yookassa_get_payment,
)
from ...common.utils.logger import logger


@app.task
def auto_cancel_unaccepted_orders():
    '''
    cancelled enroll who master not confirmed at N days.
    Refound money to client
    '''

    async def _run():
        async with db_config.Session() as session:
            enroll_repo = EnrollRepository(session)
            date_repo = ServiceDateRepository(session)
            payment_repo = PaymentRepository(session)

            days = int(getenv("AUTO_CANCEL_PENDING_DAYS", "2"))
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)

            enrolls = await session.scalars(
                db_config.select(db_config.ServiceEnroll)
                .where(
                    db_config.ServiceEnroll.status == "pending",
                    db_config.ServiceEnroll.created_at < cutoff,
                )
            )
            enrolls_list = enrolls.all()

            cancelled, refunded = 0, 0

            for enroll in enrolls_list:
                try:
                    payment = await payment_repo.get_by_enroll_id(enroll.id)
                    if payment and payment.yookassa_payment_id:
                        try:
                            y_payment = await yookassa_get_payment(payment.yookassa_payment_id)
                            y_status = y_payment.get("status")
                        except Exception:
                            y_status = payment.yookassa_status

                        if y_status == "waiting_for_capture":
                            try:
                                cancel_result = await yookassa_cancel_payment(payment.yookassa_payment_id)
                                await payment_repo.update_payment(
                                    payment_id=payment.id,
                                    yookassa_status=cancel_result.get(
                                        "status", "canceled"),
                                    status="canceled",
                                )
                                cancelled += 1
                            except Exception as e:
                                logger.error(
                                    f"Auto-cancel payment {payment.yookassa_payment_id} failed: {e}")
                        elif y_status == "succeeded":
                            try:
                                refund_result = await yookassa_create_refund(
                                    payment_id=payment.yookassa_payment_id,
                                    amount=payment.amount,
                                    description=f"Auto-refund for unaccepted enroll #{enroll.id}",
                                )
                                await payment_repo.update_payment(
                                    payment_id=payment.id,
                                    yookassa_status=refund_result.get(
                                        "status", "succeeded"),
                                    status="canceled",
                                )
                                refunded += 1
                            except Exception as e:
                                logger.error(
                                    f"Auto-refund payment {payment.yookassa_payment_id} failed: {e}")
                        else:
                            await payment_repo.update_payment(payment_id=payment.id, status="canceled")

                    if enroll.service_date_id:
                        date_obj = await date_repo.get_by_id(enroll.service_date_id)
                        if date_obj:
                            slots = date_obj.slots.copy()
                            if enroll.slot_time in slots:
                                slots[enroll.slot_time] = "available"
                            await session.merge(
                                db_config.ServiceDate(
                                    id=enroll.service_date_id, slots=slots)
                            )

                    enroll.status = "cancelled"
                except Exception as e:
                    logger.error(
                        f"Auto-cancel error for enroll {enroll.id}: {e}")

            await session.commit()
            return {
                "status": "success",
                "processed": len(enrolls_list),
                "cancelled": cancelled,
                "refunded": refunded,
            }

    try:
        return asyncio.run(_run())
    except Exception as e:
        return {"status": "failed", "detail": str(e)}
