import asyncio
from . import app
from ...common.db import db_config
from ...dates.repositories import (
    ServiceDateRepository,
    service_date_repository_exemplar
)
from ...scheduletemplates.repositories import (
    ScheduleTemplateRepository,
    schedule_template_repository_exemplar
)
from ...dates.usecases.service_date_usecase import DatesInteractionTemplates


@app.task
def generate_all_dates_schedule():
    async def _add_dates():
        async with db_config.Session() as session:
            service_date_repo = ServiceDateRepository(session)
            schedule_template_repo = ScheduleTemplateRepository(session)

            dates_interaction = DatesInteractionTemplates(
                session,
                service_date_repo,
                schedule_template_repo
            )

            return await dates_interaction.generate_schedule()

    try:
        source_list = asyncio.run(_add_dates())
        return {'status': 'dates created', 'sources': source_list}
    except Exception as e:
        return {'status': 'error', 'detail': str(e)}
