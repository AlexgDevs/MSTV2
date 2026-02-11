import asyncio
from . import app
from ...common.db import db_config
from ...dates.repositories import ServiceDateRepository
from ...dates.usecases.service_date_usecase import ServiceDateUseCase


@app.task
def check_all_dates_schedule_on_expire():
    async def _expire_dates():
        async with db_config.Session() as session:
            service_date_repo = ServiceDateRepository(session)
            service_date_usecase = ServiceDateUseCase(
                session, service_date_repo)
            return await service_date_usecase.expire_all_dates_slots()

    try:
        result = asyncio.run(_expire_dates())
        return {'status': 'dates expired', 'result': result}
    except Exception as e:
        return {'status': 'failed', 'detail': str(e)}


#Worker~
# celery -A server.common.tasks worker --pool=solo --loglevel=info
#Beat
# celery -A server.common.tasks beat --loglevel=info

#demo hold mvp confirm
