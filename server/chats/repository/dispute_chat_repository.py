from typing import Optional
from fastapi import Depends

from ...common.db import (
    AsyncSession,
    db_config,
    select,
    selectinload,
    DisputeChat,
    DisputeMessage,
)


class DisputeChatRepository:
    def __init__(
        self,
        session: AsyncSession
    ) -> None:
        self._session = session

    async def get_by_id(self, chat_id: int) -> Optional[DisputeChat]:
        chat = await self._session.scalar(
            select(DisputeChat)
            .where(DisputeChat.id == chat_id)
        )
        return chat

    async def get_by_dispute_id(self, dispute_id: int) -> Optional[DisputeChat]:
        chat = await self._session.scalar(
            select(DisputeChat)
            .where(DisputeChat.dispute_id == dispute_id)
        )
        return chat

    async def get_detail_by_id(self, chat_id: int) -> Optional[DisputeChat]:
        from ...common.db import DisputeMessage
        chat = await self._session.scalar(
            select(DisputeChat)
            .where(DisputeChat.id == chat_id)
            .options(
                selectinload(DisputeChat.master),
                selectinload(DisputeChat.client),
                selectinload(DisputeChat.arbitr),
                selectinload(DisputeChat.messages).selectinload(
                    DisputeMessage.sender)
            )
        )
        return chat

    async def get_all_by_user_id(self, user_id: int) -> list[DisputeChat]:
        from sqlalchemy import or_
        from ...common.db import ServiceEnroll, Service
        chats = await self._session.scalars(
            select(DisputeChat)
            .where(
                or_(
                    DisputeChat.master_id == user_id,
                    DisputeChat.client_id == user_id,
                    DisputeChat.arbitr_id == user_id
                )
            )
            .options(
                selectinload(DisputeChat.master),
                selectinload(DisputeChat.client),
                selectinload(DisputeChat.arbitr),
                selectinload(DisputeChat.enroll).selectinload(
                    ServiceEnroll.service)
            )
        )
        return list(chats.all())

    async def create_chat(
        self,
        dispute_id: int,
        master_id: int,
        client_id: int,
        enroll_id: int,
        arbitr_id: Optional[int] = None
    ) -> DisputeChat:
        new_chat = DisputeChat(
            dispute_id=dispute_id,
            master_id=master_id,
            client_id=client_id,
            enroll_id=enroll_id,
            arbitr_id=arbitr_id
        )
        self._session.add(new_chat)
        await self._session.flush()
        return new_chat

    async def update_arbitr_id(self, chat_id: int, arbitr_id: int) -> Optional[DisputeChat]:
        chat = await self.get_by_id(chat_id)
        if chat:
            chat.arbitr_id = arbitr_id
            self._session.add(chat)
            await self._session.flush()
        return chat


def get_dispute_chat_repository(
    session: AsyncSession = Depends(db_config.session)
) -> DisputeChatRepository:
    return DisputeChatRepository(session)
