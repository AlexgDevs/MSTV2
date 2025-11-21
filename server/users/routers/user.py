from typing import List
from fastapi import APIRouter, Depends

from ..repositories import get_user_repository
from ..schemas import UserResponse
from ...common import db_config

user_app = APIRouter(prefix='/users', tags=['Users'])

@user_app.get('/',
    response_model=List[UserResponse],
    summary='get all user',
    description='endpoint for getting all users'
)
async def all_users_response(
    user_repository = Depends(get_user_repository)) -> List[UserResponse]:
    users = await user_repository.get_all()
    return users