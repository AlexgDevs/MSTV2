import asyncio
from datetime import datetime, timedelta, timezone
from os import getenv

from . import app
from ...common.db import db_config
from ...enrolls.repositories import EnrollRepository
from ...payments.repositories import PaymentRepository
from ...common.utils.yookassa import (
    capture_payment as yookassa_capture_payment,
    get_payment as yookassa_get_payment,
    process_deal_closure as yookassa_process_deal_closure,
)
from ...common.utils.logger import logger

@app.task
def auto_capture_ready_orders():
    '''
    autp-capture and paying if client not confirmed N days after status 'ready'
    use created_at as approximation of the time when the order became ready
    '''

    async def _run():
        async with db_config.Session() as session:
            enroll_repo = EnrollRepository(session)
            payment_repo = PaymentRepository(session)

            days = int(getenv("AUTO_CAPTURE_READY_DAYS", "3"))
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)

            enrolls = await session.scalars(
                db_config.select(db_config.ServiceEnroll)
                .where(
                    db_config.ServiceEnroll.status == "ready",
                    db_config.ServiceEnroll.created_at < cutoff,
                )
            )
            enrolls_list = enrolls.all()

            captured, payouts = 0, 0
            for enroll in enrolls_list:
                try:
                    payment = await payment_repo.get_by_enroll_id(enroll.id)
                    if not payment or not payment.yookassa_payment_id:
                        continue

                    try:
                        y_payment = await yookassa_get_payment(payment.yookassa_payment_id)
                        y_status = y_payment.get("status")
                    except Exception:
                        y_status = payment.yookassa_status

                    if y_status == "waiting_for_capture":
                        try:
                            capture_result = await yookassa_capture_payment(payment.yookassa_payment_id)
                            captured += 1
                            await payment_repo.update_payment(
                                payment_id=payment.id,
                                yookassa_status=capture_result.get(
                                    "status", "succeeded"),
                                status="succeeded",
                                paid_at=capture_result.get("paid_at"),
                            )

                            payout_result = await yookassa_process_deal_closure(payment.yookassa_payment_id)
                            if payout_result.get("success"):
                                payouts += 1
                            else:
                                logger.error(
                                    f"Deal closure failed for payment {payment.yookassa_payment_id}: {payout_result}")
                        except Exception as e:
                            logger.error(
                                f"Auto-capture failed for {payment.yookassa_payment_id}: {e}")
                    elif y_status == "succeeded":
                        payout_result = await yookassa_process_deal_closure(payment.yookassa_payment_id)
                        if payout_result.get("success"):
                            payouts += 1
                        else:
                            logger.error(
                                f"Deal closure failed for payment {payment.yookassa_payment_id}: {payout_result}")

                    enroll.status = "completed"
                except Exception as e:
                    logger.error(
                        f"Auto-capture error for enroll {enroll.id}: {e}")

            await session.commit()
            return {
                "status": "success",
                "processed": len(enrolls_list),
                "captured": captured,
                "payouts_started": payouts,
            }

    try:
        return asyncio.run(_run())
    except Exception as e:
        return {"status": "failed", "detail": str(e)}

#demo hold mvp confirm