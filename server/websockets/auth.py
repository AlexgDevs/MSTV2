from fastapi import WebSocket, WebSocketException, status
from jose import jwt, JWTError
from os import getenv
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = getenv('JWT_SECRET')
ALGORITHM = getenv('ALGORITHM')

async def get_user_from_websocket(websocket: WebSocket) -> dict:
    token = websocket.query_params.get('token')

    if not token:
        cookies = websocket.cookies
        token = cookies.get('access_token')

    if not token:
        try:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        except:
            pass
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Token not provided"
        )

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])

        if payload.get('type') != 'access':
            try:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            except:
                pass
            raise WebSocketException(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Invalid token type"
            )

        user_data = payload.get('user_data')
        if not user_data:
            try:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            except:
                pass
            raise WebSocketException(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="User data not found in token"
            )

        return user_data

    except JWTError as e:
        try:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        except:
            pass
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason=f"Invalid token: {str(e)}"
        )

#demo hold mvp confirm