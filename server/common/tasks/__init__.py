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
    },
    'expire-pending-enrolls-every-minute': {
        'task': 'server.common.tasks.task_expire_pending_enrolls.expire_pending_enrolls',
        'schedule': timedelta(minutes=1),
    },
    'auto-cancel-unaccepted-orders-hourly': {
        'task': 'server.common.tasks.task_auto_cancel_unaccepted.auto_cancel_unaccepted_orders',
        'schedule': timedelta(hours=1),
    },
    'auto-capture-ready-orders-hourly': {
        'task': 'server.common.tasks.task_auto_capture_ready.auto_capture_ready_orders',
        'schedule': timedelta(hours=1),
    }
}

app.conf.timezone = 'UTC'
from . import (
    task_schedule,
    task_check_dates,
    task_expire_pending_enrolls,
    task_auto_cancel_unaccepted,
    task_auto_capture_ready,
)