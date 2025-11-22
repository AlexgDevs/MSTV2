from fastapi import HTTPException, status

class NotFoundException404:
    @staticmethod
    async def user_not_found():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='user not found'
        )