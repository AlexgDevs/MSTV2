from fastapi import Depends
from ...common.db import (
    SupportMessage,
    select,
    selectinload,
    db_config,
    AsyncSession
)

class SupportMessageRepository:
    def __init__(
        self,
        session: AsyncSession) -> None:
        
        self._session = session

    async def create_support_message(
        self,
        content: str,
        sender_id: int,
        chat_id: int
    ):

        new_message = SupportMessage(
            content=content,
            sender_id=sender_id,
            chat_id=chat_id
        )

        self._session.add(new_message)
        await self._session.flush()
        return new_message


def get_support_message_repository(
    session: AsyncSession = Depends(db_config.session)
) -> SupportMessageRepository:
    return SupportMessageRepository(session)

#demo hold mvp confirm