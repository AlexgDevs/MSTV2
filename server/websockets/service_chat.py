import json
from fastapi import WebSocket, WebSocketDisconnect, WebSocketException, status
from sqlalchemy.exc import SQLAlchemyError

from .connection_manager import service_chat_manager
from .auth import get_user_from_websocket
from ..common.db import db_config, ServiceChat, select, AsyncSession, Dispute, ServiceEnroll
from ..messages.usecases import get_service_message_use_case, ServiceMessageUseCase
from starlette.websockets import WebSocketState

MAX_MESSAGE_LENGTH = 1024  # Matches DB limit
MAX_WEBSOCKET_MESSAGE_SIZE = 10000  # 10KB limit for JSON size


async def service_chat_websocket(websocket: WebSocket, chat_id: int):
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
                select(ServiceChat)
                .where(ServiceChat.id == chat_id)
            )

            if not chat:
                try:
                    await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                except:
                    pass
                return

            user_role = user.get('role')
            # Check access: client, master, or arbitrator/admin with dispute
            has_access = False

            if chat.client_id == user_id or chat.master_id == user_id:
                has_access = True
            elif user_role in ('arbitr', 'admin'):
                # Check if there's a dispute related to this chat
                dispute = await session.scalar(
                    select(Dispute)
                    .join(ServiceEnroll, Dispute.enroll_id == ServiceEnroll.id)
                    .where(
                        ServiceEnroll.service_id == chat.service_id,
                        Dispute.client_id == chat.client_id,
                        Dispute.master_id == chat.master_id
                    )
                )
                if dispute:
                    # If user is arbitrator, check that they are assigned to this dispute
                    if user_role == 'arbitr' and dispute.arbitr_id != user_id:
                        has_access = False
                    else:
                        has_access = True

            if not has_access:
                try:
                    await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                except:
                    pass
                return

            await service_chat_manager.connect(websocket, chat_id, user_id)

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

                is_still_connected = service_chat_manager.is_user_connected(
                    chat_id, user_id)

                try:
                    await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
                except Exception as close_error:
                    pass
                return

            from ..messages.repositories import ServiceMessageRepository
            message_repo = ServiceMessageRepository(session)
            message_usecase = ServiceMessageUseCase(session, message_repo)

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
                            new_message = await message_usecase.create_service_message(
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

                            await service_chat_manager.broadcast_to_chat(
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
            service_chat_manager.disconnect(chat_id, int(user.get('id')))

    except WebSocketException:
        pass

    except Exception as e:
        if user:
            try:
                service_chat_manager.disconnect(chat_id, int(user.get('id')))
            except:
                pass
        try:
            await websocket.close()
        except:
            pass

    finally:
        if user:
            try:
                service_chat_manager.disconnect(chat_id, int(user.get('id')))
            except:
                pass
