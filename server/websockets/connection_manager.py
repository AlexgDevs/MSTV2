from typing import Dict, Set
from fastapi import WebSocket
from starlette.websockets import WebSocketState


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Dict[int, WebSocket]] = {}
        # Showing typing
        # { CHATS
        #     1: { - CHAT ID
        #         101: <WBSO>, - USER ID "101"
        #         102: <WBSO>, - ...
        #         103: <WBSO>
        #     },
        #     2: {
        #         101: <WBSO>,
        #         103: <WBSO>
        #     },
        #     3: {
        #         102: <WBSO>
        #         103: <WBSO>
        #     }
        # }

        self.user_chats: Dict[int, Set[int]] = {}
        # Showing typing
        #     user_chats = {
        #     user_id_1: {chat_id_1, chat_id_2, chat_id_3},
        #     user_id_2: {chat_id_1, chat_id_4},
        #     user_id_3: {chat_id_2, chat_id_3}
        # }

    async def connect(self, websocket: WebSocket, chat_id: int, user_id: int):
        # check chat in connections
        if chat_id not in self.active_connections:
            self.active_connections[chat_id] = {}

        # check user in chat
        if user_id in self.active_connections[chat_id]:
            # closed old connection and created new
            old_websocket = self.active_connections[chat_id][user_id]
            if old_websocket is not websocket:
                try:
                    old_state = old_websocket.client_state  # old connection
                    if old_websocket.client_state == WebSocketState.CONNECTED:
                        await old_websocket.close(code=1000, reason="New connection established")
                except Exception as e:
                    pass
            else:
                if websocket.client_state != WebSocketState.CONNECTED:
                    raise Exception(
                        f"WebSocket connection already closed, cannot reuse. State: {websocket.client_state}")

        self.active_connections[chat_id][user_id] = websocket

        if user_id not in self.user_chats:
            self.user_chats[user_id] = set()
        self.user_chats[user_id].add(chat_id)

    def disconnect(self, chat_id: int, user_id: int):
        if chat_id in self.active_connections:  # delete indexation chat -> user
            if user_id in self.active_connections[chat_id]:
                del self.active_connections[chat_id][user_id]

            if not self.active_connections[chat_id]:
                del self.active_connections[chat_id]

        if user_id in self.user_chats:  # delete revers indexation user -> chat
            self.user_chats[user_id].discard(chat_id)
            if not self.user_chats[user_id]:
                del self.user_chats[user_id]

    async def send_personal_message(self, message: dict, chat_id: int, user_id: int):
        if chat_id in self.active_connections:
            if user_id in self.active_connections[chat_id]:
                websocket = self.active_connections[chat_id][user_id]
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    self.disconnect(chat_id, user_id)
                    raise e

    async def broadcast_to_chat(self, message: dict, chat_id: int, exclude_user_id: int = None):
        if chat_id in self.active_connections:
            disconnected_users = []
            for user_id, websocket in self.active_connections[chat_id].items():
                if exclude_user_id and user_id == exclude_user_id:
                    continue
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    disconnected_users.append(user_id)

            for user_id in disconnected_users:
                self.disconnect(chat_id, user_id)

    def is_user_connected(self, chat_id: int, user_id: int) -> bool:
        return (
            chat_id in self.active_connections and
            user_id in self.active_connections[chat_id]
        )


class NotificationManager:
    def __init__(self) -> None:
        self.users_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        # Close old connection if exists
        if user_id in self.users_connections:
            old_websocket = self.users_connections[user_id]
            if old_websocket is not websocket:
                try:
                    if old_websocket.client_state == WebSocketState.CONNECTED:
                        await old_websocket.close(code=1000, reason="New connection established")
                except Exception:
                    pass

        self.users_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.users_connections:
            del self.users_connections[user_id]

    async def send_notification(self, user_id: int, notification: dict):
        if user_id in self.users_connections:
            websocket = self.users_connections[user_id]
            try:
                await websocket.send_json({
                    "type": "notification",
                    **notification
                })
            except Exception as e:
                self.disconnect(user_id)
                raise e

    async def send_notification_to_multiple(self, user_ids: list[int], notification: dict):
        disconnected_users = []
        for user_id in user_ids:
            if user_id in self.users_connections:
                websocket = self.users_connections[user_id]
                try:
                    await websocket.send_json({
                        "type": "notification",
                        **notification
                    })
                except Exception:
                    disconnected_users.append(user_id)

        for user_id in disconnected_users:
            self.disconnect(user_id)

    def is_user_connected(self, user_id: int) -> bool:
        return user_id in self.users_connections


service_chat_manager = ConnectionManager()
support_chat_manager = ConnectionManager()
dispute_chat_manager = ConnectionManager()
notification_manager = NotificationManager()
