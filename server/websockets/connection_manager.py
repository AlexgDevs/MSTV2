from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Dict[int, WebSocket]] = {}
        self.user_chats: Dict[int, Set[int]] = {}

    async def connect(self, websocket: WebSocket, chat_id: int, user_id: int):
        if chat_id not in self.active_connections:
            self.active_connections[chat_id] = {}

        if user_id in self.active_connections[chat_id]:
            old_websocket = self.active_connections[chat_id][user_id]
            if old_websocket is not websocket:
                try:
                    from starlette.websockets import WebSocketState
                    old_state = old_websocket.client_state

                    if old_websocket.client_state == WebSocketState.CONNECTED:
                        await old_websocket.close(code=1000, reason="New connection established")
                except Exception as e:
                    pass
            else:
                from starlette.websockets import WebSocketState
                if websocket.client_state != WebSocketState.CONNECTED:
                    raise Exception(
                        f"WebSocket connection already closed, cannot reuse. State: {websocket.client_state}")

        self.active_connections[chat_id][user_id] = websocket

        if user_id not in self.user_chats:
            self.user_chats[user_id] = set()
        self.user_chats[user_id].add(chat_id)

    def disconnect(self, chat_id: int, user_id: int):
        if chat_id in self.active_connections:
            if user_id in self.active_connections[chat_id]:
                del self.active_connections[chat_id][user_id]

            if not self.active_connections[chat_id]:
                del self.active_connections[chat_id]

        if user_id in self.user_chats:
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


service_chat_manager = ConnectionManager()
support_chat_manager = ConnectionManager()
