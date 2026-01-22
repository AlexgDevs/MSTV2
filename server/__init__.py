from fastapi import APIRouter

from .services import service_app
from .users import user_app, auth_app
from .scheduletemplates import template_app
from .dates import service_date_app
from .enrolls import enroll_app
from .tags import tag_app
from .payments import payment_app
from .accounts import account_app
from .chats import service_chat_app, support_chat_app, dispute_chat_app
from .dispute import dispute_app
from .arbitrage import arbitrage_app
from .common import lifespan, RateLimitMiddleware, db_config
from .websockets import (
    websocket_router, 
    notification_routes,
    dispute_chat_websocket,
    service_chat_websocket,
    support_chat_websocket,
    notifications_websocket
)


master_app = APIRouter(prefix='/api/v1', tags=['MASTER'])

master_app.include_router(user_app)
master_app.include_router(auth_app)
master_app.include_router(template_app)
master_app.include_router(service_date_app)
master_app.include_router(enroll_app)
master_app.include_router(tag_app)
master_app.include_router(service_app)
master_app.include_router(payment_app)
master_app.include_router(account_app)
master_app.include_router(service_chat_app)
master_app.include_router(support_chat_app)
master_app.include_router(dispute_chat_app)
master_app.include_router(notification_routes)
master_app.include_router(dispute_app)
master_app.include_router(arbitrage_app)
