from time import sleep
from typing import List
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..schemas import (
    CreateDisputeModel
)

from ...common import db_config
from ...common.db import (
    Dispute,
    selectinload
)


class DisputeRepository:
    def __init__(
            self,
            session: AsyncSession) -> None:

        self._session = session

    async def create_dispute(
            self,
            client_id: int,
            dispute_data: CreateDisputeModel) -> Dispute:

        new_dispute = Dispute(
            client_id=client_id,
            **dispute_data.model_dump()
        )

        self._session.add(new_dispute)
        await self._session.flush()
        return new_dispute

    async def get_by_id(self, dispute_id: int) -> Dispute | None:
        dispute = await self._session.scalar(
            select(Dispute)
            .where(Dispute.id == dispute_id)
        )

        return dispute

    async def get_detail_dispute(
            self,
            dispute_id: int) -> Dispute | None:
        dispute = await self._session.scalar(
            select(Dispute)
            .where(Dispute.id == dispute_id)
            .options(
                selectinload(Dispute.client),
                selectinload(Dispute.master),
                selectinload(Dispute.arbitr),
                selectinload(Dispute.enroll)
            )
        )

        return dispute

    async def get_all(self, wait_arbitr: bool = True) -> List[Dispute]:
        if wait_arbitr:
            disputes = await self._session.scalars(
                select(Dispute)
                .where(Dispute.disput_status == 'wait_for_arbitr')
            )

        disputes = await self._session.scalars(
            select(Dispute)
        )

        return disputes

    async def get_all_by_arbitr(self, arbitr_id: int) -> List[Dispute]:
        disputes = await self._session.scalars(
            select(Dispute)
            .where(Dispute.arbitr_id == arbitr_id)
        )

        return disputes

    async def get_all_by_client(self, client_id: int) -> List[Dispute]:
        disputes = await self._session.scalars(
            select(Dispute)
            .where(Dispute.client_id == client_id)
        )

        return disputes

    async def get_all_by_master(self, master_id: int) -> List[Dispute]:
        disputes = await self._session.scalars(
            select(Dispute)
            .where(Dispute.master_id == master_id)
        )

        return disputes

    async def update_dispute(
        self,
        dispute_id: int,
        **kwargs
    ) -> Dispute | None:
        dispute = await self.get_by_id(dispute_id)
        if not dispute:
            return None

        for key, value in kwargs.items():
            if hasattr(dispute, key):
                setattr(dispute, key, value)

        await self._session.flush()
        return dispute

    async def delete_dispute(self, dispute_id: int) -> bool:
        dispute = await self.get_by_id(dispute_id)
        if not dispute:
            return False

        await self._session.delete(dispute)
        await self._session.flush()
        return True


def get_dispute_repository(
    session: AsyncSession = Depends(db_config.session)
) -> DisputeRepository:
    return DisputeRepository(session)

#demo hold mvp confirm