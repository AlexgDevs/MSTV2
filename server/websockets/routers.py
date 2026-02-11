from fastapi import APIRouter
from .service_chat import service_chat_websocket
from .support_chat import support_chat_websocket
from .dispute_chat import dispute_chat_websocket
from .notfifcations import notifications_websocket

websocket_router = APIRouter()

websocket_router.websocket(
    "/ws/service-chats/{chat_id}")(service_chat_websocket)

websocket_router.websocket(
    "/ws/support-chats/{chat_id}")(support_chat_websocket)

websocket_router.websocket(
    "/ws/dispute-chats/{chat_id}")(dispute_chat_websocket)

websocket_router.websocket(
    "/ws/notifications")(notifications_websocket)

#demo hold mvp confirm
