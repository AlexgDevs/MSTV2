from typing import List, Dict, Any
from dotenv.main import logger
from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError
from ..repositories import get_dispute_repository, DisputeRepository
from ..schemas import (
    CreateDisputeModel,
    DetailDisputRespone,
    DisputeResponse,
    SimpleUserDisputResponse,
    SimpleEnrollDisputResponse
)

from ...common.db import (
    db_config,
    AsyncSession
)


class DisputeUseCase():
    def __init__(
            self,
            session: AsyncSession,
            dispute_repository: DisputeRepository) -> None:

        self._session = session
        self._dispute_repository = dispute_repository

    async def create_dispute(
        self,
        dispute_data: CreateDisputeModel,
        client_id: int
    ):

        try:
            new_dispute = await self._dispute_repository.create_dispute(
                client_id,
                dispute_data
            )
            await self._session.commit()

            # Create chat for dispute
            from ...chats.usecases import get_dispute_chat_usecase, DisputeChatUsecase
            from ...chats.repository import get_dispute_chat_repository, DisputeChatRepository
            dispute_chat_repo = DisputeChatRepository(self._session)
            dispute_chat_usecase = DisputeChatUsecase(
                self._session, dispute_chat_repo)
            chat_result = await dispute_chat_usecase.create_dispute_chat(new_dispute.id)
            if isinstance(chat_result, dict) and chat_result.get('status') == 'failed':
                logger.error(
                    f'Failed to create dispute chat: {chat_result.get("detail")}')

            return new_dispute

        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error(
                'error', f'failed creating dispute, detail - {str(e)}')
            return {'status': 'failed creating dispute', 'detail': str(e)}

    async def get_disputes_by_client(self, client_id: int) -> List[DisputeResponse]:
        try:
            disputes = await self._dispute_repository.get_all_by_client(client_id)
            disputes_list = list(disputes.all()) if hasattr(
                disputes, 'all') else list(disputes)
            return [
                DisputeResponse(
                    id=d.id,
                    client_id=d.client_id,
                    master_id=d.master_id,
                    enroll_id=d.enroll_id,
                    arbitr_id=d.arbitr_id,
                    reason=d.reason,
                    disput_status=d.disput_status,
                    winner_type=d.winner_type,
                    created_at=d.created_at,
                    taken_at=d.taken_at,
                    completed_at=d.completed_at
                )
                for d in disputes_list
            ]
        except Exception as e:
            logger.error(f'Error getting disputes by client: {str(e)}')
            return []

    async def get_disputes_by_master(self, master_id: int) -> List[DisputeResponse]:
        try:
            disputes = await self._dispute_repository.get_all_by_master(master_id)
            disputes_list = list(disputes.all()) if hasattr(
                disputes, 'all') else list(disputes)
            return [
                DisputeResponse(
                    id=d.id,
                    client_id=d.client_id,
                    master_id=d.master_id,
                    enroll_id=d.enroll_id,
                    arbitr_id=d.arbitr_id,
                    reason=d.reason,
                    disput_status=d.disput_status,
                    winner_type=d.winner_type,
                    created_at=d.created_at,
                    taken_at=d.taken_at,
                    completed_at=d.completed_at
                )
                for d in disputes_list
            ]
        except Exception as e:
            logger.error(f'Error getting disputes by master: {str(e)}')
            return []

    async def get_disputes_by_arbitr(self, arbitr_id: int) -> List[DisputeResponse]:
        try:
            disputes = await self._dispute_repository.get_all_by_arbitr(arbitr_id)
            disputes_list = list(disputes.all()) if hasattr(
                disputes, 'all') else list(disputes)
            return [
                DisputeResponse(
                    id=d.id,
                    client_id=d.client_id,
                    master_id=d.master_id,
                    enroll_id=d.enroll_id,
                    arbitr_id=d.arbitr_id,
                    reason=d.reason,
                    disput_status=d.disput_status,
                    winner_type=d.winner_type,
                    created_at=d.created_at,
                    taken_at=d.taken_at,
                    completed_at=d.completed_at
                )
                for d in disputes_list
            ]
        except Exception as e:
            logger.error(f'Error getting disputes by arbitr: {str(e)}')
            return []

    async def get_detail_dispute(self, dispute_id: int) -> DetailDisputRespone | None:
        try:
            dispute = await self._dispute_repository.get_detail_dispute(dispute_id)
            if not dispute:
                return None

            return DetailDisputRespone(
                id=dispute.id,
                client=SimpleUserDisputResponse(
                    id=dispute.client.id,
                    name=dispute.client.name,
                    role=dispute.client.role
                ),
                master=SimpleUserDisputResponse(
                    id=dispute.master.id,
                    name=dispute.master.name,
                    role=dispute.master.role
                ),
                arbitr=SimpleUserDisputResponse(
                    id=dispute.arbitr.id,
                    name=dispute.arbitr.name,
                    role=dispute.arbitr.role
                ) if dispute.arbitr else None,
                enroll=SimpleEnrollDisputResponse(
                    id=dispute.enroll.id,
                    slot_time=dispute.enroll.slot_time,
                    status=dispute.enroll.status,
                    price=dispute.enroll.price,
                    created_at=dispute.enroll.created_at,
                    user_id=dispute.enroll.user_id,
                    service_id=dispute.enroll.service_id,
                    service_date_id=dispute.enroll.service_date_id
                ),
                reason=dispute.reason,
                disput_status=dispute.disput_status,
                winner_type=dispute.winner_type,
                created_at=dispute.created_at,
                taken_at=dispute.taken_at,
                completed_at=dispute.completed_at
            )
        except Exception as e:
            logger.error(f'Error getting detail dispute: {str(e)}')
            return None

    async def delete_dispute(self, dispute_id: int, user_id: int) -> Dict[str, Any]:
        try:
            dispute = await self._dispute_repository.get_by_id(dispute_id)
            if not dispute:
                return {
                    'status': 'error',
                    'detail': 'Dispute not found'
                }

            # Check that user can delete dispute (only client or master)
            if dispute.client_id != user_id and dispute.master_id != user_id:
                return {
                    'status': 'error',
                    'detail': 'Access denied: You can only delete your own disputes'
                }

            # Cannot delete dispute if it's already in process or closed
            if dispute.disput_status != 'wait_for_arbitr':
                return {
                    'status': 'error',
                    'detail': 'Cannot delete dispute: Dispute is already in process or closed'
                }

            result = await self._dispute_repository.delete_dispute(dispute_id)
            if result:
                await self._session.commit()
                return {
                    'status': 'success',
                    'message': 'Dispute deleted successfully'
                }
            else:
                return {
                    'status': 'error',
                    'detail': 'Failed to delete dispute'
                }

        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error(f'Error deleting dispute: {str(e)}')
            return {
                'status': 'error',
                'detail': f'Database error: {str(e)}'
            }
        except Exception as e:
            await self._session.rollback()
            logger.error(f'Unexpected error deleting dispute: {str(e)}')
            return {
                'status': 'error',
                'detail': f'Error: {str(e)}'
            }


def get_dispute_usecase(
    session: AsyncSession = Depends(db_config.session),
    dispute_repository: DisputeRepository = Depends(get_dispute_repository)
) -> DisputeUseCase:
    return DisputeUseCase(
        session,
        dispute_repository
    )
