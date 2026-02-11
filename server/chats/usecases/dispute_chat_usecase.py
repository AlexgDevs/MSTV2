from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError

from ..repository import (
    get_dispute_chat_repository,
    DisputeChatRepository
)

from ...common.db import (
    AsyncSession,
    db_config,
    DisputeChat,
    Dispute,
    select,
)

from ...common.utils import logger


class DisputeChatUsecase:
    def __init__(
        self,
        session: AsyncSession,
        dispute_chat_repository: DisputeChatRepository
    ) -> None:
        self._session = session
        self._dispute_chat_repository = dispute_chat_repository

    async def create_dispute_chat(
        self,
        dispute_id: int
    ) -> DisputeChat | dict:
        try:
            # Get dispute information
            dispute = await self._session.scalar(
                select(Dispute)
                .where(Dispute.id == dispute_id)
            )

            if not dispute:
                return {'status': 'failed', 'detail': 'Dispute not found'}

            # Check if chat already exists for this dispute
            existing_chat = await self._dispute_chat_repository.get_by_dispute_id(dispute_id)
            if existing_chat:
                return existing_chat

            # Create new chat
            new_chat = await self._dispute_chat_repository.create_chat(
                dispute_id=dispute_id,
                master_id=dispute.master_id,
                client_id=dispute.client_id,
                enroll_id=dispute.enroll_id,
                arbitr_id=dispute.arbitr_id
            )
            await self._session.flush()
            await self._session.commit()
            logger.info(
                f'Created DisputeChat {new_chat.id} for dispute {dispute_id}')
            return new_chat
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error('error', f'failed creating dispute chat: {str(e)}')
            return {'status': 'failed creating dispute chat', 'detail': str(e)}

    async def update_arbitr_in_chat(
        self,
        dispute_id: int,
        arbitr_id: int
    ) -> DisputeChat | dict:
        try:
            chat = await self._dispute_chat_repository.get_by_dispute_id(dispute_id)
            if not chat:
                return {'status': 'failed', 'detail': 'Chat not found'}

            updated_chat = await self._dispute_chat_repository.update_arbitr_id(chat.id, arbitr_id)
            await self._session.commit()
            return updated_chat
        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error('error', f'failed updating dispute chat: {str(e)}')
            return {'status': 'failed updating dispute chat', 'detail': str(e)}


def get_dispute_chat_usecase(
    session: AsyncSession = Depends(db_config.session),
    dispute_chat_repository: DisputeChatRepository = Depends(
        get_dispute_chat_repository)
) -> DisputeChatUsecase:
    return DisputeChatUsecase(session, dispute_chat_repository)

#demo hold mvp confirm