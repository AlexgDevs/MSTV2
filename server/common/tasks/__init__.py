from datetime import timedelta
from os import getenv
import time
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
        'schedule': timedelta(minutes=1),
    },
    'check-all-dates-slots-every-hour': {
        'task': 'server.common.tasks.task_check_dates.check_all_dates_schedule_on_expire',
        'schedule': timedelta(minutes=1),
    }
}

app.conf.timezone = 'UTC'

from . import task_schedule, task_check_dates