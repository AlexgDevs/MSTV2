from fastapi import HTTPException, status


class NotFoundException404:
    @staticmethod
    async def user_not_found():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='user not found'
        )

    @staticmethod
    async def tag_not_found():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='tag not found'
        )

    @staticmethod
    async def date_not_found():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='date not found'
        )

    @staticmethod
    async def template_not_found():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='template not found'
        )

    @staticmethod
    async def service_not_found():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='service not found'
        )

    @staticmethod
    async def enroll_not_found():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='enroll not found'
        )

#demo hold mvp confirm