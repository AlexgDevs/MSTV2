from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError

from ..repository import (
    get_service_chat_repository,
    ServiceChatRepository
)

from ..schemas import CreatedServiceChat

from ...common.db import (
    AsyncSession,
    db_config,
    ServiceChat
)

from ...common.utils import logger

class ServiceChatUsecase:
    def __init__(
        self,
        session: AsyncSession,
        service_chat_repository: ServiceChatRepository) -> None:

        self._session = session
        self._service_chat_repository = service_chat_repository

    async def create_service_chat(self, chat_data: CreatedServiceChat, client_id: int) -> ServiceChat:
        try:
            new_chat = await self._service_chat_repository.create_chat(chat_data, client_id)
            await self._session.commit()
            return new_chat
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error('error', f'failed creating service chat: {str(e)}')
            return {'status': 'failed creating service chat', 'detail': str(e)}

    async def delete_service_chat(self, user_id: int, chat_id: int) -> bool:
        try:
            deleted = await self._service_chat_repository.delete_chat(chat_id, user_id)
            await self._session.commit()
            return deleted
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error('error', f'failed deleting service chat: {str(e)}')
            return {'status': 'failed deleting service chat', 'detail': str(e)}


def get_service_chat_usecase(
    session: AsyncSession = Depends(db_config.session),
    service_chat_repository: ServiceChatRepository = Depends(get_service_chat_repository)
) -> ServiceChatUsecase:
    return ServiceChatUsecase(session, service_chat_repository)