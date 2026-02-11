import asyncio
from os import getenv
from . import app
from ...common.db import db_config
from ...enrolls.repositories import (
    EnrollRepository,
)
from ...dates.repositories import (
    ServiceDateRepository,
)
from ...enrolls.usecases.booking_usecase import BookingUseCase
from ...payments.repositories import PaymentRepository


@app.task
def expire_pending_enrolls():
    async def _expire_enrolls():
        async with db_config.Session() as session:
            enroll_repo = EnrollRepository(session)
            service_date_repo = ServiceDateRepository(session)
            payment_repo = PaymentRepository(session)

            booking_usecase = BookingUseCase(
                session,
                enroll_repo,
                service_date_repo,
                payment_repo
            )

            timeout_minutes = int(
                getenv('PENDING_ENROLL_TIMEOUT_MINUTES', '15'))

            return await booking_usecase.expire_pending_enrolls(timeout_minutes=timeout_minutes)

    try:
        result = asyncio.run(_expire_enrolls())
        return result
    except Exception as e:
        return {'status': 'failed', 'detail': str(e)}

#demo hold mvp confirm