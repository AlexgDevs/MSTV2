from fastapi import Depends
from ...common.db import (
    ServiceMessage,
    select,
    selectinload,
    db_config,
    AsyncSession
)

class ServiceMessageRepository:
    def __init__(
        self,
        session: AsyncSession) -> None:
        
        self._session = session

    async def create_service_message(
        self,
        content: str,
        sender_id: int,
        chat_id: int
    ):

        new_message = ServiceMessage(
            content=content,
            sender_id=sender_id,
            chat_id=chat_id
        )

        self._session.add(new_message)
        await self._session.flush()
        return new_message


def get_service_message_repository(
    session: AsyncSession = Depends(db_config.session)
) -> ServiceMessageRepository:
    return ServiceMessageRepository(session)

#demo hold mvp confirm