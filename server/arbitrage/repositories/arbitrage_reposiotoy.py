from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...common import db_config
from ...common.db import (
    Dispute,
    selectinload
)


class ArbitrageRepository:
    def __init__(
            self,
            session: AsyncSession) -> None:

        self._session = session

    async def get_dispute_by_id(
        self,
        dispute_id: int,
        load_relations: bool = False
    ) -> Dispute | None:
        query = select(Dispute).where(Dispute.id == dispute_id)

        if load_relations:
            query = query.options(
                selectinload(Dispute.client),
                selectinload(Dispute.master),
                selectinload(Dispute.arbitr),
                selectinload(Dispute.enroll)
            )

        dispute = await self._session.scalar(query)
        return dispute

    async def take_dispute(
        self,
        dispute_id: int,
        arbitr_id: int
    ) -> Dispute | None:
        dispute = await self.get_dispute_by_id(dispute_id)

        if not dispute:
            return None

        if dispute.disput_status != 'wait_for_arbitr':
            return None

        if dispute.arbitr_id is not None:
            return None

        dispute.arbitr_id = arbitr_id
        dispute.disput_status = 'in_process'
        dispute.taken_at = datetime.now(timezone.utc)

        await self._session.flush()
        return dispute

    async def resolve_dispute(
        self,
        dispute_id: int,
        winner_type: str
    ) -> Dispute | None:
        dispute = await self.get_dispute_by_id(dispute_id, load_relations=True)

        if not dispute:
            return None

        if dispute.disput_status != 'in_process':
            return None

        dispute.disput_status = 'closed'
        dispute.winner_type = winner_type
        dispute.completed_at = datetime.now(timezone.utc)

        await self._session.flush()
        return dispute


def get_arbitrage_repository(
    session: AsyncSession = Depends(db_config.session)
) -> ArbitrageRepository:
    return ArbitrageRepository(session)

#demo hold mvp confirm