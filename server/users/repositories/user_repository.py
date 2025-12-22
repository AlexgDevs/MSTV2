from typing import List

from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError

from server.common.db.models.service import ServiceEnroll
from server.users.schemas.user import PatchUserModel

from ...common.db import (
    AsyncSession,
    User,
    Service,
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
        return result.all()

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
                selectinload(User.services_enroll).selectinload(
                    ServiceEnroll.service).selectinload(Service.user),
                selectinload(User.services_enroll).selectinload(
                    ServiceEnroll.service_date),
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

    async def create_user(self, user_data: CreateUserModel, verifi_code: str) -> User:
        user_dict = user_data.model_dump(exclude={'recaptcha_token'})
        new_user = User(**user_dict, verified_code=verifi_code)
        self._session.add(new_user)
        await self._session.flush()
        return new_user

    async def update_user(self, user_id: int, user_data: PatchUserModel) -> User:
        updating_user = await self._session.merge(
            User(
                id=user_id,
                **user_data.model_dump(
                    exclude_none=True,
                    exclude_unset=True)
            )
        )
        await self._session.flush()
        await self._session.refresh(updating_user)
        return updating_user


def get_user_repository(
    session: AsyncSession = Depends(db_config.session)
) -> UserRepository:
    return UserRepository(session)
