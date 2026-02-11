from typing import List
from fastapi import Depends

from ...common.db import (
    AsyncSession,
    db_config,
    joinedload,
    select,
    selectinload,
    ServiceChat,
    Dispute,
    ServiceEnroll,
)

from ..schemas import CreatedServiceChat


class ServiceChatRepository:
    def __init__(
        self,
        session: AsyncSession
    ) -> None:

        self._session = session

    async def get_all(self) -> List[ServiceChat]:
        chats = await self._session.scalars(
            select(ServiceChat)
        )

        return chats.all()

    async def get_by_id(self, chat_id: int) -> ServiceChat | None:
        chat = await self._session.scalar(
            select(ServiceChat)
            .where(ServiceChat.id == chat_id)
        )

        return chat

    async def get_all_by_user_id(self, user_id: int) -> dict[str, List[ServiceChat]]:
        chats = {}

        client_chats = await self._session.scalars(
            select(ServiceChat)
            .where(ServiceChat.client_id == user_id)
            .options(
                selectinload(ServiceChat.client),
                selectinload(ServiceChat.master),
                selectinload(ServiceChat.service)
            )
        )

        master_chats = await self._session.scalars(
            select(ServiceChat)
            .where(ServiceChat.master_id == user_id)
            .options(
                selectinload(ServiceChat.client),
                selectinload(ServiceChat.master),
                selectinload(ServiceChat.service)
            )
        )

        chats['client_chats'] = client_chats.all()
        chats['master_chats'] = master_chats.all()
        return chats

    async def get_detail_by_user_chat_id(self, user_id: int, chat_id: int, user_role: str | None = None) -> ServiceChat | None:
        # Check if user is a client
        client_chat = await self._session.scalar(
            select(ServiceChat)
            .where(
                ServiceChat.id == chat_id,
                ServiceChat.client_id == user_id
            )
            .options(
                selectinload(ServiceChat.client),
                selectinload(ServiceChat.master),
                selectinload(ServiceChat.service),
                selectinload(ServiceChat.messages)
            )
        )

        if client_chat:
            return client_chat

        # Check if user is a master
        master_chat = await self._session.scalar(
            select(ServiceChat)
            .where(
                ServiceChat.id == chat_id,
                ServiceChat.master_id == user_id
            )
            .options(
                selectinload(ServiceChat.client),
                selectinload(ServiceChat.master),
                selectinload(ServiceChat.service),
                selectinload(ServiceChat.messages)
            )
        )

        if master_chat:
            return master_chat

        # If user is arbitrator or admin, check if there's a dispute for this chat
        if user_role in ('arbitr', 'admin'):
            # Get chat without user check
            chat = await self.get_by_id(chat_id)
            if chat:
                # Check if there's a dispute where this chat is linked through enroll
                dispute = await self._session.scalar(
                    select(Dispute)
                    .join(ServiceEnroll, Dispute.enroll_id == ServiceEnroll.id)
                    .where(
                        ServiceEnroll.service_id == chat.service_id,
                        Dispute.client_id == chat.client_id,
                        Dispute.master_id == chat.master_id
                    )
                )
                if dispute:
                    # If user is arbitrator, check that they are assigned to this dispute
                    if user_role == 'arbitr' and dispute.arbitr_id != user_id:
                        return None
                    # Load chat with relations
                    chat_with_relations = await self._session.scalar(
                        select(ServiceChat)
                        .where(ServiceChat.id == chat_id)
                        .options(
                            selectinload(ServiceChat.client),
                            selectinload(ServiceChat.master),
                            selectinload(ServiceChat.service),
                            selectinload(ServiceChat.messages)
                        )
                    )
                    return chat_with_relations

        return None

    async def get_by_service_master_client(
        self,
        service_id: int,
        master_id: int,
        client_id: int
    ) -> ServiceChat | None:
        chat = await self._session.scalar(
            select(ServiceChat)
            .where(
                ServiceChat.service_id == service_id,
                ServiceChat.master_id == master_id,
                ServiceChat.client_id == client_id
            )
        )
        return chat

    async def create_chat(self, chat_data: CreatedServiceChat, client_id: int) -> ServiceChat:
        new_chat = ServiceChat(**chat_data.model_dump(), client_id=client_id)
        self._session.add(new_chat)
        await self._session.flush()
        return new_chat

    async def delete_chat(self, chat_id: int, user_id: int) -> bool:
        chat = await self._session.scalar(
            select(ServiceChat)
            .where(ServiceChat.id == chat_id, ServiceChat.user_id == user_id)
        )
        if not chat:
            return False
        await self._session.delete(chat)
        await self._session.flush()
        return True


def get_service_chat_repository(
        session: AsyncSession = Depends(db_config.session)) -> ServiceChatRepository:
    return ServiceChatRepository(session)

#demo hold mvp confirm