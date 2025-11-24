from typing import List

from dotenv.main import logger
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status
)

from server.common.utils.exceptions._400 import Exceptions400
from server.common.utils.jwtconfig import JWT_SECRET, JWTManager
from server.users.schemas.user import DetailUserResponse, PatchUserModel
from server.users.usecases.user_usecase import UserUseCase

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
async def get_all_users(
        user_repository: UserRepository = Depends(get_user_repository)) -> List[UserResponse]:
    users = await user_repository.get_all()
    return users


@user_app.get('/me',
            response_model=DetailUserResponse,
            summary='get current user',
            description='endpoint for getting current user')
async def get_current_user(
    user = Depends(JWTManager.auth_required),
    user_repository: UserRepository = Depends(get_user_repository)
) -> DetailUserResponse:

    user_exit = await user_repository.get_by_id_detail(
        int(user.get('id'))
    )

    if not user_exit:
        await NotFoundException404.user_not_found()
    return user_exit


@user_app.patch('/me',
                summary='patch update current user',
                description='endpoint for patch update current user'
                )
async def patch_update_user(
    update_user_data: PatchUserModel,
    user = Depends(JWTManager.auth_required),
    user_use_case: UserUseCase = Depends(get_user_use_case)
):
    exiting = await user_use_case.patch_update_user(
        int(user.get('id')), 
        update_user_data)

    if isinstance(exiting, dict):
        await Exceptions400.creating_error(str(exiting.get('detail')))

    return {'status': 'updating'}


@user_app.get('/{user_id}',
              response_model=UserResponse,
              summary='get user by id',
              description='endpoint for getting user by id'
              )
async def get_user_by_id(
    user_id: int,
    user_repository: UserRepository = Depends(get_user_repository),
) -> UserResponse:
    user = await user_repository.get_by_id(user_id)
    if not user:
        await NotFoundException404.user_not_found()
    return user