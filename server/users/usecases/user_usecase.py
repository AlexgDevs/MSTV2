from typing import List

from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError

from ...common.db import (
    AsyncSession,
    User,
    db_config,
    joinedload,
    select,
    selectinload
)
from ...common.utils import logger
from ..repositories import UserRepository, get_user_repository
from ..schemas import CreateUserModel


class UserUseCase:
    def __init__(
        self,
        session: AsyncSession,
        user_repository: UserRepository
    ) -> None:

        self._session = session
        self._user_repository = user_repository

    async def create_user(
        self,
        user_data: CreateUserModel
    ) -> User | dict:
        existing_user = await self._user_repository.get_by_name(user_data.name)
        if existing_user:
            return {'status': 'failed created user', 'detail': 'User with this name already exists'}

        existing_email = await self._user_repository.get_by_email(user_data.email)
        if existing_email:
            return {'status': 'failed created user', 'detail': 'User with this email already exists'}

        try:
            user = await self._user_repository.create_user(user_data)  # f
            await self._session.commit()  # c f+c = rtrn
            return user
        except SQLAlchemyError as e:
            await self._session.rollback()  # r
            logger.error('error', f'failed created user: {str(e)}')
            return {'status': 'failed created user', 'detail': str(e)}


def get_user_use_case(
    session: AsyncSession = Depends(db_config.session),
    user_repository: UserRepository = Depends(get_user_repository)
) -> UserUseCase:
    return UserUseCase(session, user_repository)
