from time import sleep
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from server.common.db.models.service import Service

from ..schemas import (
    CreateEnrollModel
)

from ...common import db_config
from ...common.db import (
    ServiceEnroll,
    User
)


class EnrollRepository:
    def __init__(
            self,
            session: AsyncSession) -> None:

        self._session = session

    async def get_all(self):
        enrolls = await self._session.scalars(
            select(ServiceEnroll)
        )

        return enrolls.all()

    async def get_by_service_id(
        self,
        service_id: int
    ):

        enrolls = await self._session.scalars(
            select(ServiceEnroll)
            .where(ServiceEnroll.service_id == service_id)
            .options(selectinload(ServiceEnroll.user))
        )

        return enrolls.all()

    async def get_by_enroll_user_id(
        self,
        enroll_id: int,
        user_id: int
    ):

        enroll = await self._session.scalar(
            select(ServiceEnroll)
            .where(
                ServiceEnroll.id == enroll_id,
                ServiceEnroll.user_id == user_id)
        )

        return enroll

    async def get_by_id(
        self,
        enroll_id: int
    ):
        enroll = await self._session.scalar(
            select(ServiceEnroll)
            .where(ServiceEnroll.id == enroll_id)
        )
        return enroll

    async def get_by_user_id(
        self,
        user_id: int
    ):

        enrolls = await self._session.scalars(
            select(ServiceEnroll)
            .where(ServiceEnroll.user_id == user_id)
        )

        return enrolls.all()

    async def get_by_service_user_id(
        self,
        service_id: int,
        user_id: int
    ):

        enrolls = await self._session.scalars(
            select(ServiceEnroll)
            .where(
                ServiceEnroll.user_id == user_id,
                ServiceEnroll.service_id == service_id)
        )

        return enrolls.all()

    async def get_by_slot_service_date_user_id(
        self,
        service_date_id: int,
        user_id: int,
        slot_time: str
    ):

        enroll = await self._session.scalar(
            select(ServiceEnroll)
            .where(
                ServiceEnroll.service_date_id == service_date_id,
                ServiceEnroll.user_id == user_id,
                ServiceEnroll.slot_time == slot_time)
        )

        return enroll

    async def create_enroll(
        self,
        user_id: int,
        enroll_data: CreateEnrollModel
    ):

        new_enroll = ServiceEnroll(
            user_id=user_id,
            **enroll_data.model_dump()
        )
        self._session.add(new_enroll)
        await self._session.flush()
        return new_enroll


def get_enroll_repository(
    session: AsyncSession = Depends(db_config.session)
) -> EnrollRepository:
    return EnrollRepository(session)

#demo hold mvp confirm