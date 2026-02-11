from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError

from ..repositories import (
    DisputeMessageRepository,
    get_dispute_message_repository
)

from ...common.db import (
    db_config,
    AsyncSession
)

from ...common.utils import logger


class DisputeMessageUseCase:
    def __init__(
        self,
        session: AsyncSession,
        dispute_message_repository: DisputeMessageRepository
    ) -> None:
        self._session = session
        self._dispute_message_repository = dispute_message_repository

    async def create_dispute_message(
        self,
        content: str,
        sender_id: int,
        chat_id: int
    ):
        try:
            new_message = await self._dispute_message_repository.create_dispute_message(
                content,
                sender_id,
                chat_id
            )
            await self._session.commit()
            return new_message
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error(
                'error', f'failed creating dispute message, detail: {str(e)}')
            return {'status': 'failed creating dispute message', 'detail': str(e)}


def get_dispute_message_use_case(
    session: AsyncSession = Depends(db_config.session),
    dispute_message_repository: DisputeMessageRepository = Depends(
        get_dispute_message_repository)
) -> DisputeMessageUseCase:
    return DisputeMessageUseCase(session, dispute_message_repository)

#demo hold mvp confirm