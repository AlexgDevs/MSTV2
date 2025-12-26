from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError

from ..repositories import (
    ServiceMessageRepository,
    get_service_message_repository
)

from ...common.db import (
    ServiceMessage,
    select,
    selectinload,
    db_config,
    AsyncSession
)

from ...common.utils import logger

class ServiceMessageUseCase:
    def __init__(
        self,
        session: AsyncSession,
        service_message_repository: ServiceMessageRepository) -> None:

        self._session = session
        self._serivice_message_repository = service_message_repository

    async def create_service_message(
        self,
        content: str,
        sender_id: int,
        chat_id: int
    ):

        try:
            new_message = await self._serivice_message_repository.create_service_message(
                content,
                sender_id,
                chat_id
            )
            await self._session.commit()
            return new_message
        except SQLAlchemyError as e:
            logger.error('error', f'failed creating message, detail: {str(e)}')
            return {'status': 'failed creating message', 'detail': str(e)}


def get_service_message_use_case(
    session: AsyncSession = Depends(db_config.session),
    service_message_repository: ServiceMessageRepository = Depends(get_service_message_repository)
) -> ServiceMessageUseCase:
    return ServiceMessageUseCase(
        session,
        service_message_repository
    )