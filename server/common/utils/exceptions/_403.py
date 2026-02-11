from fastapi import (
    HTTPException,
    status
)


class Exceptions403:
    @staticmethod
    async def alredy_loggined():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='alredy logined'
        )

    @staticmethod
    async def not_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='you are not admin'
        )

    @staticmethod
    async def booked():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='date is booked'
        )

    @staticmethod
    async def email_not_verified():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='email not verifed'
        )

    @staticmethod
    async def forbidden():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='forbidden'
        )

#demo hold mvp confirm