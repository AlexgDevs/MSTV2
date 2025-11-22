from fastapi import (
    HTTPException,
    status
)

class Exceptions401:
    @staticmethod
    async def invalid_token():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='invalid token'
        )

    @staticmethod
    async def invalid_token_type():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='invalid token type'
        )

    @staticmethod
    async def token_not_found():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='token not found'
        )