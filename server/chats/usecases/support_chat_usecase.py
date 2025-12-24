from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError

from ..repository import (
    get_support_chat_repository,
    SupportChatRepository
)

from ..schemas import CreatedSupportChat

from ...common.db import (
    AsyncSession,
    db_config,
    SupportChat
)

from ...common.utils import logger

class SupportChatUsecase:
    def __init__(
        self,
        session: AsyncSession,
        support_chat_repository: SupportChatRepository
    ) -> None:

        self._session = session
        self._support_chat_repository = support_chat_repository

    async def create_support_chat(self, chat_data: CreatedSupportChat, client_id: int) -> SupportChat:
        try:
            new_chat = await self._support_chat_repository.create_chat(chat_data, client_id)
            await self._session.commit()
            return new_chat
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error('error', f'failed creating support chat: {str(e)}')
            return {'status': 'failed creating support chat', 'detail': str(e)}

    async def delete_support_chat(self, user_id: int, chat_id: int) -> bool:
        try:
            deleted = await self._support_chat_repository.delete_chat(chat_id, user_id)
            await self._session.commit()
            return deleted
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error('error', f'failed deleting support chat: {str(e)}')
            return {'status': 'failed deleting support chat', 'detail': str(e)}


def get_support_chat_usecase(
    session: AsyncSession = Depends(db_config.session),
    support_chat_repository: SupportChatRepository = Depends(get_support_chat_repository)
) -> SupportChatUsecase:
    return SupportChatUsecase(session, support_chat_repository)