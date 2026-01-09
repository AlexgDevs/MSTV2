from asyncio import create_task
from typing import Dict, Any
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select

from ...common import db_config
from ...common.db.models.service import ServiceEnroll
from ...common.db.models.payment import Payment
from ...common.utils.logger import logger
from ...common.utils.yookassa import trafic_orchestrator, dispute_orchestrator
from ..repositories import ArbitrageRepository, get_arbitrage_repository
from ..schemas import TakeDisputeModel, ResolveDisputeModel


class ArbitrageUseCase:
    def __init__(
        self,
        session: AsyncSession,
        arbitrage_repository: ArbitrageRepository
    ) -> None:
        self._session = session
        self._arbitrage_repository = arbitrage_repository

    async def take_dispute(
        self,
        dispute_id: int,
        arbitr_id: int
    ) -> Dict[str, Any]:
        try:
            dispute = await self._arbitrage_repository.take_dispute(
                dispute_id=dispute_id,
                arbitr_id=arbitr_id
            )

            if not dispute:
                return {
                    'status': 'error',
                    'detail': 'Dispute not found or cannot be taken'
                }

            await self._session.commit()

            # Update chat by adding arbitrator
            from ...chats.usecases import get_dispute_chat_usecase, DisputeChatUsecase
            from ...chats.repository import get_dispute_chat_repository, DisputeChatRepository
            dispute_chat_repo = DisputeChatRepository(self._session)
            dispute_chat_usecase = DisputeChatUsecase(
                self._session, dispute_chat_repo)
            await dispute_chat_usecase.update_arbitr_in_chat(dispute.id, arbitr_id)

            return {
                'status': 'success',
                'dispute_id': dispute.id,
                'message': 'Dispute taken successfully'
            }

        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error(f'Error taking dispute: {str(e)}')
            return {
                'status': 'error',
                'detail': f'Database error: {str(e)}'
            }
        except Exception as e:
            await self._session.rollback()
            logger.error(f'Unexpected error taking dispute: {str(e)}')
            return {
                'status': 'error',
                'detail': f'Error: {str(e)}'
            }

    async def _background_process_orchestrator(self, yookassa_payment_id: str, winner_type: str):
        """background work orchestrator for dispute resolution"""
        try:
            result = await dispute_orchestrator(yookassa_payment_id, winner_type)
            logger.info(
                f"Dispute orchestrator processed for payment {yookassa_payment_id} with winner_type {winner_type}: {result}")
        except Exception as e:
            logger.error(
                f"Error in dispute orchestrator for payment {yookassa_payment_id}: {str(e)}")

    async def resolve_dispute(
        self,
        dispute_id: int,
        winner_type: str,
        arbitr_id: int
    ) -> Dict[str, Any]:
        try:
            dispute = await self._arbitrage_repository.get_dispute_by_id(dispute_id)

            if not dispute:
                return {
                    'status': 'error',
                    'detail': 'Dispute not found'
                }

            if dispute.arbitr_id != arbitr_id:
                return {
                    'status': 'error',
                    'detail': 'Access denied: This dispute is not assigned to you'
                }

            resolved_dispute = await self._arbitrage_repository.resolve_dispute(
                dispute_id=dispute_id,
                winner_type=winner_type
            )

            if not resolved_dispute:
                return {
                    'status': 'error',
                    'detail': 'Cannot resolve dispute: Invalid status'
                }

            await self._session.commit()

            payment = await self._session.scalar(
                select(Payment)
                .where(Payment.enroll_id == resolved_dispute.enroll_id)
            )

            if payment and payment.yookassa_payment_id:
                if payment.status == 'succeeded' or payment.yookassa_status == 'succeeded':
                    create_task(
                        self._background_process_orchestrator(
                            payment.yookassa_payment_id,
                            winner_type
                        )
                    )
                    logger.info(
                        f"Dispute orchestrator started for payment {payment.yookassa_payment_id} with winner_type {winner_type} after dispute resolution")

            return {
                'status': 'success',
                'dispute_id': resolved_dispute.id,
                'winner_type': winner_type,
                'message': 'Dispute resolved successfully',
                'orchestrator_started': payment is not None and payment.yookassa_payment_id is not None
            }

        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error(f'Error resolving dispute: {str(e)}')
            return {
                'status': 'error',
                'detail': f'Database error: {str(e)}'
            }
        except Exception as e:
            await self._session.rollback()
            logger.error(f'Unexpected error resolving dispute: {str(e)}')
            return {
                'status': 'error',
                'detail': f'Error: {str(e)}'
            }


def get_arbitrage_usecase(
    session: AsyncSession = Depends(db_config.session),
    arbitrage_repository: ArbitrageRepository = Depends(
        get_arbitrage_repository)
) -> ArbitrageUseCase:
    return ArbitrageUseCase(session, arbitrage_repository)
