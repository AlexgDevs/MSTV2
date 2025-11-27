from fastapi import APIRouter
from .common import db_config
from .users import user_app, auth_app
from .services import service_app
from .scheduletemplates import template_app
from .dates import service_date_app
from .enrolls import enroll_app

master_app = APIRouter(prefix='/api/v1', tags=['MASTER'])
master_app.include_router(user_app)
master_app.include_router(auth_app)
master_app.include_router(service_app)
master_app.include_router(template_app)
master_app.include_router(service_date_app)
master_app.include_router(enroll_app)