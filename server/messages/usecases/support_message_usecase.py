from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError

from ..repositories import (
    SupportMessageRepository,
    get_support_message_repository
)

from ...common.db import (
    SupportMessage,
    select,
    selectinload,
    db_config,
    AsyncSession
)

from ...common.utils import logger


class SupportMessageUseCase:
    def __init__(
            self,
            session: AsyncSession,
            support_message_repository: SupportMessageRepository) -> None:

        self._session = session
        self._support_message_repository = support_message_repository

    async def create_support_message(
        self,
        content: str,
        sender_id: int,
        chat_id: int
    ):

        try:
            new_message = await self._support_message_repository.create_support_message(
                content,
                sender_id,
                chat_id
            )
            await self._session.commit()
            return new_message
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error(
                'error', f'failed creating support message, detail: {str(e)}')
            return {'status': 'failed creating support message', 'detail': str(e)}


def get_support_message_use_case(
    session: AsyncSession = Depends(db_config.session),
    support_message_repository: SupportMessageRepository = Depends(
        get_support_message_repository)
) -> SupportMessageUseCase:
    return SupportMessageUseCase(
        session,
        support_message_repository
    )

#demo hold mvp confirm