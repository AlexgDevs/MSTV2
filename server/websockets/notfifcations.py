from fastapi import WebSocket, WebSocketDisconnect, WebSocketException, status
from .connection_manager import notification_manager
from .auth import get_user_from_websocket
from starlette.websockets import WebSocketState


async def notifications_websocket(websocket: WebSocket):
    user = None

    try:
        await websocket.accept()

        try:
            user = await get_user_from_websocket(websocket)
            user_id = int(user.get('id'))
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await notification_manager.connect(websocket, user_id)

        try:
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json({
                    "type": "connected",
                    "user_id": user_id
                })
        except Exception:
            return

        while True:
            try:
                if websocket.client_state != WebSocketState.CONNECTED:
                    return
                await websocket.receive_text()
            except WebSocketDisconnect:
                return
            except Exception:
                return

    except WebSocketDisconnect:
        if user:
            notification_manager.disconnect(int(user.get('id')))

    except WebSocketException:
        pass

    except Exception:
        if user:
            try:
                notification_manager.disconnect(int(user.get('id')))
            except:
                pass
        try:
            await websocket.close()
        except:
            pass

    finally:
        if user:
            try:
                notification_manager.disconnect(int(user.get('id')))
            except:
                pass

#demo hold mvp confirm