from typing import List

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status
)

from ...common import db_config
from ...common.utils import NotFoundException404
from ..repositories import UserRepository, get_user_repository
from ..schemas import CreateUserModel, UserResponse
from ..usecases import get_user_use_case

user_app = APIRouter(prefix='/users', tags=['Users'])


@user_app.get('/',
              response_model=List[UserResponse],
              summary='get all user',
              description='endpoint for getting all users'
              )
async def all_users_response(
        user_repository: UserRepository = Depends(get_user_repository)) -> List[UserResponse]:
    users = await user_repository.get_all()
    return users


@user_app.get('/{user_id}',
              response_model=UserResponse,
              summary='get user by id',
              description='endpoint for getting user by id'
              )
async def user_response(
    user_id: int,
    user_repository: UserRepository = Depends(get_user_repository),
) -> UserResponse:
    user = await user_repository.get_by_id(user_id)
    if not user:
        await NotFoundException404.user_not_found()
    return user
