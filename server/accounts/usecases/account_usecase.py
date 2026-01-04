from typing import Dict, Any
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from ...common import db_config
from ...common.db.models.accounts import Account
from ...common.utils.logger import logger
from ..repositories import AccountRepository, get_account_repository
from ..schemas import CreateAccountModel, UpdateAccountModel


class AccountUseCase:
    def __init__(
        self,
        session: AsyncSession,
        account_repository: AccountRepository
    ) -> None:
        self._session = session
        self._account_repository = account_repository

    async def create_account(
        self,
        user_id: int,
        account_data: CreateAccountModel
    ) -> Dict[str, Any]:
        try:
            # Проверяем, есть ли уже счет у пользователя
            existing_account = await self._account_repository.get_by_user_id(user_id)
            if existing_account:
                return {
                    'status': 'error',
                    'detail': 'Account already exists for this user'
                }

            # Валидация полей в зависимости от метода выплаты
            validation_error = self._validate_account_data(account_data)
            if validation_error:
                return validation_error

            account = await self._account_repository.create_account(
                user_id=user_id,
                payout_method=account_data.payout_method,
                full_name=account_data.full_name,
                card_number=account_data.card_number,
                bank_account=account_data.bank_account,
                yoomoney_wallet=account_data.yoomoney_wallet,
                phone=account_data.phone,
                inn=account_data.inn
            )

            await self._session.commit()
            return {
                'status': 'success',
                'account': account
            }

        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error(f"Error creating account: {str(e)}")
            return {
                'status': 'error',
                'detail': 'Database error while creating account'
            }
        except Exception as e:
            await self._session.rollback()
            logger.error(f"Unexpected error creating account: {str(e)}")
            return {
                'status': 'error',
                'detail': 'Unexpected error occurred'
            }

    async def get_account_by_user_id(
        self,
        user_id: int
    ) -> Dict[str, Any]:
        try:
            account = await self._account_repository.get_by_user_id(user_id)
            if not account:
                return {
                    'status': 'error',
                    'detail': 'Account not found'
                }

            return {
                'status': 'success',
                'account': account
            }

        except Exception as e:
            logger.error(f"Error getting account: {str(e)}")
            return {
                'status': 'error',
                'detail': 'Error getting account'
            }

    async def update_account(
        self,
        user_id: int,
        account_data: UpdateAccountModel
    ) -> Dict[str, Any]:
        try:
            account = await self._account_repository.get_by_user_id(user_id)
            if not account:
                return {
                    'status': 'error',
                    'detail': 'Account not found'
                }

            # Валидация полей в зависимости от метода выплаты
            if account_data.payout_method:
                validation_error = self._validate_account_data(
                    CreateAccountModel(
                        payout_method=account_data.payout_method,
                        full_name=account_data.full_name or account.full_name,
                        card_number=account_data.card_number,
                        bank_account=account_data.bank_account,
                        yoomoney_wallet=account_data.yoomoney_wallet,
                        phone=account_data.phone,
                        inn=account_data.inn
                    )
                )
                if validation_error:
                    return validation_error

            updated_account = await self._account_repository.update_account(
                account_id=account.id,
                payout_method=account_data.payout_method,
                full_name=account_data.full_name,
                card_number=account_data.card_number,
                bank_account=account_data.bank_account,
                yoomoney_wallet=account_data.yoomoney_wallet,
                phone=account_data.phone,
                inn=account_data.inn,
                is_active=account_data.is_active
            )

            if not updated_account:
                return {
                    'status': 'error',
                    'detail': 'Failed to update account'
                }

            await self._session.commit()
            return {
                'status': 'success',
                'account': updated_account
            }

        except SQLAlchemyError as e:
            await self._session.rollback()
            logger.error(f"Error updating account: {str(e)}")
            return {
                'status': 'error',
                'detail': 'Database error while updating account'
            }
        except Exception as e:
            await self._session.rollback()
            logger.error(f"Unexpected error updating account: {str(e)}")
            return {
                'status': 'error',
                'detail': 'Unexpected error occurred'
            }

    def _validate_account_data(self, account_data: CreateAccountModel) -> Dict[str, Any] | None:
        """Валидация данных счета в зависимости от метода выплаты"""
        if account_data.payout_method == 'bank_card':
            if not account_data.card_number:
                return {
                    'status': 'error',
                    'detail': 'Card number is required for bank card payout method'
                }
        elif account_data.payout_method == 'yoo_money':
            if not account_data.yoomoney_wallet:
                return {
                    'status': 'error',
                    'detail': 'YooMoney wallet is required for YooMoney payout method'
                }
        elif account_data.payout_method == 'sbp':
            if not account_data.phone:
                return {
                    'status': 'error',
                    'detail': 'Phone number is required for SBP payout method'
                }
        elif account_data.payout_method == 'bank_account':
            if not account_data.bank_account:
                return {
                    'status': 'error',
                    'detail': 'Bank account is required for bank account payout method'
                }
        elif account_data.payout_method == 'self_employed':
            if not account_data.inn:
                return {
                    'status': 'error',
                    'detail': 'INN is required for self-employed payout method'
                }

        return None


def get_account_usecase(
    session: AsyncSession = Depends(db_config.session),
    account_repository: AccountRepository = Depends(get_account_repository)
) -> AccountUseCase:
    return AccountUseCase(session, account_repository)

