from fastapi import Depends
from typing import List
from sqlalchemy.exc import SQLAlchemyError

from ...common.db import (
    User,
    db_config,
    AsyncSession,
    selectinload,
    joinedload,
    select
)


class UserRepository:
    def __init__(
        self,
        session: AsyncSession
    ) -> None:

        self._session = session

    async def get_all(self) -> List[User]:
        users = await self._session.scalars(
            select(User)
        )

        return users


    async def get_by_id(
        self,
        user_id: int) -> User | None:

        user = await self._session.scalar(
            select(User)
            .where(User.id == user_id)
        )

        return user


    async def get_by_id_detail(
        self,
        user_id: int) -> User | None:

        user = await self._session.scalar(
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.templates),
                selectinload(User.services),
                selectinload(User.services_enroll),
                selectinload(User.tags)
            )
        )

        return user


    async def create_user(self, user_data: dict) -> User | None:
        try:
            new_user = User(**user_data)
            self._session.add(new_user)
            await self._session.flush()
            return new_user
        except SQLAlchemyError:
            await self._session.rollback()
            return None


def get_user_repository(
    session: AsyncSession = Depends(db_config.session)
) -> UserRepository:
    return UserRepository(session)