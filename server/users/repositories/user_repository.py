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
from ..schemas import CreateUserModel


class UserRepository:
    def __init__(
        self,
        session: AsyncSession
    ) -> None:

        self._session = session

    async def get_all(self) -> List[User]:
        result = await self._session.scalars(
            select(User)
        )
        return list(result.all())

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

    async def get_by_name(self, name: str) -> User | None:
        user = await self._session.scalar(
            select(User).where(User.name == name)
        )
        return user

    async def get_by_email(self, email: str) -> User | None:
        user = await self._session.scalar(
            select(User).where(User.email == email)
        )
        return user

    async def create_user(self, user_data: CreateUserModel) -> User:
        new_user = User(**user_data.model_dump())
        self._session.add(new_user)
        await self._session.flush()
        return new_user


def get_user_repository(
    session: AsyncSession = Depends(db_config.session)
) -> UserRepository:
    return UserRepository(session)