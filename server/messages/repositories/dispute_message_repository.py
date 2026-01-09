from fastapi import Depends
from ...common.db import (
    DisputeMessage,
    db_config,
    AsyncSession
)


class DisputeMessageRepository:
    def __init__(
        self,
        session: AsyncSession
    ) -> None:
        self._session = session

    async def create_dispute_message(
        self,
        content: str,
        sender_id: int,
        chat_id: int
    ) -> DisputeMessage:
        new_message = DisputeMessage(
            content=content,
            sender_id=sender_id,
            chat_id=chat_id
        )
        self._session.add(new_message)
        await self._session.flush()
        return new_message


def get_dispute_message_repository(
    session: AsyncSession = Depends(db_config.session)
) -> DisputeMessageRepository:
    return DisputeMessageRepository(session)
