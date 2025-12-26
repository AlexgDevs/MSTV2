import json
from fastapi import WebSocket, WebSocketDisconnect, WebSocketException, status
from sqlalchemy.exc import SQLAlchemyError

from .connection_manager import support_chat_manager
from .auth import get_user_from_websocket
from ..common.db import db_config, SupportChat, select, AsyncSession
from ..messages.usecases import get_support_message_use_case, SupportMessageUseCase
from ..messages.repositories import SupportMessageRepository


async def support_chat_websocket(websocket: WebSocket, chat_id: int):
    user = None

    try:
        await websocket.accept()

        try:
            user = await get_user_from_websocket(websocket)
            user_id = int(user.get('id'))
        except Exception as auth_error:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        async with db_config.Session() as session:
            chat = await session.scalar(
                select(SupportChat)
                .where(SupportChat.id == chat_id)
            )

            if not chat:
                try:
                    await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                except:
                    pass
                return

            if chat.client_id != user_id and chat.support_id != user_id:
                try:
                    await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                except:
                    pass
                return

            await support_chat_manager.connect(websocket, chat_id, user_id)

            try:
                await websocket.send_json({
                    "type": "connected",
                    "chat_id": chat_id,
                    "user_id": user_id
                })
            except:
                return

            support_message_repo = SupportMessageRepository(session)
            support_message_usecase = SupportMessageUseCase(
                session, support_message_repo)

            while True:
                try:
                    data = await websocket.receive_json()
                except WebSocketDisconnect:
                    return
                except Exception as receive_error:
                    return

                try:
                    if data.get("type") == "message":
                        content = data.get("content", "").strip()

                        if not content:
                            try:
                                await websocket.send_json({
                                    "type": "error",
                                    "message": "Message content cannot be empty"
                                })
                            except:
                                return
                            continue

                        try:
                            new_message = await support_message_usecase.create_support_message(
                                content=content,
                                sender_id=user_id,
                                chat_id=chat_id
                            )

                            message_data = {
                                "type": "message",
                                "id": new_message.id,
                                "content": new_message.content,
                                "sender_id": new_message.sender_id,
                                "chat_id": new_message.chat_id,
                                "created_at": new_message.created_at.isoformat()
                            }

                            await support_chat_manager.broadcast_to_chat(
                                message_data,
                                chat_id,
                                exclude_user_id=user_id
                            )

                            try:
                                await websocket.send_json({
                                    "type": "message_sent",
                                    "message": message_data
                                })
                            except:
                                return

                        except SQLAlchemyError as e:
                            try:
                                await websocket.send_json({
                                    "type": "error",
                                    "message": "Failed to send message"
                                })
                            except:
                                return

                    elif data.get("type") == "ping":
                        try:
                            await websocket.send_json({"type": "pong"})
                        except:
                            return

                    else:
                        try:
                            await websocket.send_json({
                                "type": "error",
                                "message": f"Unknown message type: {data.get('type')}"
                            })
                        except:
                            return

                except json.JSONDecodeError:
                    try:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Invalid JSON format"
                        })
                    except:
                        return
                except Exception as e:
                    try:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Internal server error"
                        })
                    except:
                        return

    except WebSocketDisconnect:
        if user:
            support_chat_manager.disconnect(chat_id, int(user.get('id')))

    except WebSocketException:
        pass

    except Exception as e:
        if user:
            try:
                support_chat_manager.disconnect(chat_id, int(user.get('id')))
            except:
                pass
        try:
            await websocket.close()
        except:
            pass

    finally:
        if user:
            try:
                support_chat_manager.disconnect(chat_id, int(user.get('id')))
            except:
                pass
