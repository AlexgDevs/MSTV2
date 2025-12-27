
from fastapi import APIRouter, Depends, status, HTTPException
from .schemas import SendNotificationRequest, SendNotificationToMultipleRequest
from ..common.utils import JWTManager
from .connection_manager import notification_manager

notification_routes = APIRouter(
    prefix='/notifications', tags=['Notifications'])


@notification_routes.post('/send',
                          summary='Send notification to user',
                          description='Endpoint for sending notification to a specific user (admin only)')
async def send_notification(
    request: SendNotificationRequest,
    user: dict = Depends(JWTManager.admin_required)
):
    if not notification_manager.is_user_connected(request.user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Пользователь {request.user_id} не подключен к WebSocket"
        )

    try:
        await notification_manager.send_notification(
            request.user_id,
            {
                "title": request.title,
                "message": request.message,
                "type": request.type,
                "data": request.data or {}
            }
        )
        return {"status": "sent", "user_id": request.user_id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка отправки уведомления: {str(e)}"
        )


@notification_routes.post('/send-multiple',
                          summary='Send notification to multiple users',
                          description='Endpoint for sending notifications to multiple users at once (admin only)')
async def send_notification_to_multiple(
    request: SendNotificationToMultipleRequest,
    user: dict = Depends(JWTManager.admin_required)
):

    try:
        await notification_manager.send_notification_to_multiple(
            request.user_ids,
            {
                "title": request.title,
                "message": request.message,
                "type": request.type,
                "data": request.data or {}
            }
        )
        return {"status": "sent", "user_ids": request.user_ids}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка отправки уведомлений: {str(e)}"
        )


@notification_routes.get('/connected-users',
                         summary='Get list of connected users',
                         description='Returns list of user_ids connected to WebSocket notifications (admin only)')
async def get_connected_users(
    user: dict = Depends(JWTManager.admin_required)
):
    connected_users = list(notification_manager.users_connections.keys())
    return {
        "connected_users": connected_users,
        "count": len(connected_users)
    }
