from fastapi import (
    HTTPException,
    status
)

class Exceptions400:
    @staticmethod
    async def creating_error(detail: str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

    @staticmethod
    async def invalid_password():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='uncorrected password'
        )