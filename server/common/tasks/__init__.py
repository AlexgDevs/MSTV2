from datetime import timedelta
from os import getenv
from celery.schedules import crontab

from celery import Celery
from dotenv import load_dotenv

load_dotenv()

app = Celery(
    'mstv2_worker',
    broker=getenv('REDIS_BROKER'),
    backend=getenv('REDIS_BACKEND')
)


app.conf.beat_schedule = {
    'generate-schedule-every-sunday': {
        'task': 'server.common.tasks.task_schedule.generate_all_dates_schedule',
        'schedule': timedelta(seconds=10),
    },
}
app.conf.timezone = 'UTC'


from . import task_schedule 