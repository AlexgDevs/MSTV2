from typing import List
from fastapi import Depends

from ...common.db import (
    AsyncSession,
    db_config,
    joinedload,
    select,
    selectinload,
    SupportChat,
)

from ..schemas import CreatedSupportChat


class SupportChatRepository:
    def __init__(
        self,
        session: AsyncSession
    ) -> None:

        self._session = session

    async def get_all(self) -> List[SupportChat]:
        chats = await self._session.scalars(
            select(SupportChat)
        )
        return chats.all()

    async def get_by_id(self, chat_id: int) -> SupportChat | None:
        chat = await self._session.scalar(
            select(SupportChat)
            .where(SupportChat.id == chat_id)
        )

        return chat

    async def get_all_by_user_id(self, user_id: int) -> List[SupportChat]:
        chats = {}
        
        client_chats = await self._session.scalars(
            select(SupportChat)
            .where(SupportChat.client_id == user_id)
        )

        support_chats = await self._session.scalars(
            select(SupportChat)
            .where(SupportChat.support_id == user_id)
        )

        chats['client_chats'] = client_chats.all()
        chats['support_chats'] = support_chats.all()
        return chats

    async def get_detail_by_user_chat_id(self, user_id: int, chat_id: int) -> SupportChat | None:
        client_chat = await self._session.scalar(
            select(SupportChat)
            .where(
                SupportChat.id == chat_id,
                SupportChat.client_id == user_id
            )
            .options(
                selectinload(SupportChat.client),
                selectinload(SupportChat.support),
                selectinload(SupportChat.messages))
            )

        if not client_chat:
            support_chat = await self._session.scalar(
                select(SupportChat)
                .where(
                    SupportChat.id == chat_id,
                    SupportChat.support_id == user_id
                )
                .options(
                    selectinload(SupportChat.client),
                    selectinload(SupportChat.support),
                    selectinload(SupportChat.messages))
            )
            if not support_chat:
                return None
            return support_chat
        return client_chat

    async def create_chat(self, chat_data: CreatedSupportChat, client_id: int) -> SupportChat:
        new_chat = SupportChat(**chat_data.model_dump(), client_id=client_id)
        self._session.add(new_chat)
        await self._session.flush()
        return new_chat

    async def delete_chat(self, chat_id: int, user_id: int) -> bool:
        chat = await self._session.scalar(
            select(SupportChat)
            .where(SupportChat.id == chat_id, SupportChat.client_id == user_id)
        )
        if not chat:
            return False
        await self._session.delete(chat)
        await self._session.flush()
        return True

def get_support_chat_repository(
    session: AsyncSession = Depends(db_config.session)) -> SupportChatRepository:
    return SupportChatRepository(session)

#demo hold mvp confirm