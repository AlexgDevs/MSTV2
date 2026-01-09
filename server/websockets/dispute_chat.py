import json
from fastapi import WebSocket, WebSocketDisconnect, WebSocketException, status
from sqlalchemy.exc import SQLAlchemyError

from .connection_manager import dispute_chat_manager
from .auth import get_user_from_websocket
from ..common.db import db_config, DisputeChat, select, AsyncSession
from ..messages.usecases import get_dispute_message_use_case, DisputeMessageUseCase
from ..common.utils import logger
from starlette.websockets import WebSocketState

MAX_MESSAGE_LENGTH = 1024
MAX_WEBSOCKET_MESSAGE_SIZE = 10000


async def dispute_chat_websocket(websocket: WebSocket, chat_id: int):
    user = None

    try:
        await websocket.accept()

        try:
            user = await get_user_from_websocket(websocket)
            user_id = int(user.get('id'))
            logger.info(
                f'WebSocket connection attempt: user_id={user_id}, chat_id={chat_id}')
        except Exception as auth_error:
            import traceback
            logger.error(
                f'WebSocket auth error for chat_id={chat_id}: {str(auth_error)}\n{traceback.format_exc()}')
            try:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            except:
                pass
            return

        async with db_config.Session() as session:
            chat = await session.scalar(
                select(DisputeChat)
                .where(DisputeChat.id == chat_id)
            )

            if not chat:
                logger.error(
                    f'DisputeChat {chat_id} not found for user_id={user_id}')
                try:
                    await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                except:
                    pass
                return

            is_master = chat.master_id == user_id
            is_client = chat.client_id == user_id
            is_arbitr = chat.arbitr_id is not None and chat.arbitr_id == user_id

            logger.info(
                f'WebSocket access check: user_id={user_id}, chat_id={chat_id}, master_id={chat.master_id}, client_id={chat.client_id}, arbitr_id={chat.arbitr_id}, is_master={is_master}, is_client={is_client}, is_arbitr={is_arbitr}')

            if not (is_master or is_client or is_arbitr):
                logger.warning(
                    f'Access denied: user_id={user_id} is not a participant of chat_id={chat_id} (master_id={chat.master_id}, client_id={chat.client_id}, arbitr_id={chat.arbitr_id})')
                try:
                    await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                except:
                    pass
                return

            await dispute_chat_manager.connect(websocket, chat_id, user_id)

            try:
                client_state = websocket.client_state
                app_state = websocket.application_state

                if client_state != WebSocketState.CONNECTED:
                    return

                message_data = {
                    "type": "connected",
                    "chat_id": chat_id,
                    "user_id": user_id
                }

                await websocket.send_json(message_data)
            except Exception as send_error:
                import traceback
                error_details = {
                    'error_type': type(send_error).__name__,
                    'error_message': str(send_error),
                    'error_args': send_error.args if hasattr(send_error, 'args') else None,
                    'traceback': traceback.format_exc()
                }

                is_still_connected = dispute_chat_manager.is_user_connected(
                    chat_id, user_id)

                try:
                    await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
                except Exception as close_error:
                    pass
                return

            from ..messages.repositories import DisputeMessageRepository
            message_repo = DisputeMessageRepository(session)
            message_usecase = DisputeMessageUseCase(session, message_repo)

            while True:
                try:
                    if websocket.client_state != WebSocketState.CONNECTED:
                        return

                    raw_data = await websocket.receive_text()
                    if len(raw_data) > MAX_WEBSOCKET_MESSAGE_SIZE:
                        await websocket.close(code=status.WS_1009_MESSAGE_TOO_BIG)
                        return

                    data = json.loads(raw_data)
                except WebSocketDisconnect:
                    return
                except json.JSONDecodeError:
                    try:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Invalid JSON format"
                        })
                    except:
                        return
                    continue
                except Exception as receive_error:
                    import traceback
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

                        if len(content) > MAX_MESSAGE_LENGTH:
                            try:
                                await websocket.send_json({
                                    "type": "error",
                                    "message": f"Message too long. Maximum {MAX_MESSAGE_LENGTH} characters"
                                })
                            except:
                                return
                            continue

                        try:
                            new_message = await message_usecase.create_dispute_message(
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

                            await dispute_chat_manager.broadcast_to_chat(
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
            dispute_chat_manager.disconnect(chat_id, int(user.get('id')))

    except WebSocketException:
        pass

    except Exception as e:
        if user:
            try:
                dispute_chat_manager.disconnect(chat_id, int(user.get('id')))
            except:
                pass
        try:
            await websocket.close()
        except:
            pass

    finally:
        if user:
            try:
                dispute_chat_manager.disconnect(chat_id, int(user.get('id')))
            except:
                pass
