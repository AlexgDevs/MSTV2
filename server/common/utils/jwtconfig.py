from os import getenv
from datetime import (
    timedelta,
    datetime,
    timezone
)

from dotenv import load_dotenv

from jose import (
    jwt,
    JWTError
)

from fastapi import (
    Response,
    Request
)

from ..utils.exceptions import (
    Exceptions401,
    Exceptions403
)

load_dotenv()

JWT_SECRET = getenv('JWT_SECRET')
ACCESS_EXPIRE = getenv('ACCESS_EXPIRE')
REFRESH_EXPIRE = getenv('REFRESH_EXPIRE')
ALGORITHM = getenv('ALGORITHM')


class TokenFactory:
    @staticmethod
    async def create_access_token(user_data: dict) -> str:
        exp = datetime.now(timezone.utc) + timedelta(days=int(ACCESS_EXPIRE))
        payload = {
            'sub': str(user_data.get('id')),
            'user_data': user_data,
            'exp': exp,
            'type': 'access'
        }

        return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

    @staticmethod
    async def create_refresh_token(user_data: dict) -> str:
        exp = datetime.now(timezone.utc) + timedelta(days=int(REFRESH_EXPIRE))
        payload = {
            'sub': str(user_data.get('id')),
            'user_data': user_data,
            'exp': exp,
            'type': 'refresh'
        }

        return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

    @staticmethod
    async def verify_token(token: str, is_refresh: bool = False) -> dict:
        try:
            payload = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=[ALGORITHM]
            )

            if is_refresh:
                if payload.get('type') != 'refresh':
                    await Exceptions401.invalid_token_type()

                return payload
            return payload

        except JWTError:
            await Exceptions401.invalid_token()

    @staticmethod
    async def access_by_refresh(token):
        if token:
            try:
                payload = jwt.decode(
                    token,
                    JWT_SECRET,
                    algorithms=[ALGORITHM]
                )

                if payload.get('type') != 'refresh':
                    await Exceptions401.invalid_token_type()

                return await TokenFactory.create_access_token(payload.get('user_data'))

            except JWTError:
                await Exceptions401.invalid_token()
        await Exceptions401.token_not_found()


class CookieManager:
    @staticmethod
    async def set_custom_cookies(
            response: Response,
            access_token: str,
            refresh_token: str):

        access_max_age = (int(ACCESS_EXPIRE) * 24 * 60 * 60
                          if ACCESS_EXPIRE else 3600)

        refresh_max_age = (int(REFRESH_EXPIRE) * 24 * 60 * 60
                           if REFRESH_EXPIRE else 604800)

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=access_max_age,
            path="/",
        )

        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=refresh_max_age,
            path="/",
        )

    @staticmethod
    async def set_access(
            response: Response,
            access_token: str):

        access_max_age = (int(ACCESS_EXPIRE) * 24 * 60 * 60
                          if ACCESS_EXPIRE else 3600)

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=access_max_age,
            path="/",
        )

    @staticmethod
    async def delete_cookies(
            response: Response):

        response.delete_cookie(
            'access_token',
            path='/',
            samesite='lax'
        )
        response.delete_cookie(
            'refresh_token',
            path='/',
            samesite='lax'
        )


class JWTManager:
    @staticmethod
    async def is_token(request: Request):
        access_token = request.cookies.get('access_token')
        refresh_token = request.cookies.get('refresh_token')
        if access_token or refresh_token:
            await Exceptions403.alredy_loggined()

    @staticmethod
    async def current_user(request: Request, is_admin: bool = False):
        token = request.cookies.get('access_token')
        if token:
            try:
                payload = jwt.decode(
                    token,
                    JWT_SECRET,
                    algorithms=[ALGORITHM]
                )

                if payload.get('type') != 'access':
                    await Exceptions401.invalid_token_type()

                if is_admin:
                    if payload.get('user_data').get('role') == 'admin':
                        return payload.get('user_data')
                    await Exceptions403.not_admin()

                return payload.get('user_data')

            except JWTError:
                await Exceptions401.invalid_token()

        await Exceptions401.token_not_found()

    @staticmethod
    async def auth_required(request: Request):
        return await JWTManager.current_user(request)

    @staticmethod
    async def not_auth_required(request: Request):
        return await JWTManager.is_token(request)

    @staticmethod
    async def admin_required(request: Request):
        return await JWTManager.current_user(request, is_admin=True)
