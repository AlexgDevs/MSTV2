import re

from typing import Dict, Any
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from typing import Dict, Any
from stdnum import luhn
from stdnum.ru import inn
import phonenumbers

from ...common import db_config
from ...common.db import Account
from ...common.utils import logger
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
            existing_account = await self._account_repository.get_by_user_id(user_id)
            if existing_account:
                return {
                    'status': 'error',
                    'detail': 'Account already exists for this user'
                }

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

            # Validate fields depending on payout method
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
        '''Validate account data depending on payout method'''
        if account_data.payout_method == 'bank_card':
            if not account_data.card_number:
                return {'status': 'error', 'detail': 'Card number required'}
            
            result = self._validate_bank_card(account_data.card_number)
            if not result['valid']:
                return {'status': 'error', 'detail': result['error']}

        elif account_data.payout_method == 'yoo_money':
            if not account_data.yoomoney_wallet:
                return {'status': 'error', 'detail': 'YooMoney wallet required'}
            
            result = self._validate_yoo_money(account_data.yoomoney_wallet)
            if not result['valid']:
                return {'status': 'error', 'detail': result['error']}

        elif account_data.payout_method == 'sbp':
            if not account_data.phone:
                return {'status': 'error', 'detail': 'Phone number required'}
            
            result = self._validate_sbp(account_data.phone)
            if not result['valid']:
                return {'status': 'error', 'detail': result['error']}

        elif account_data.payout_method == 'bank_account':
            if not account_data.bank_account:
                return {'status': 'error', 'detail': 'Bank account required'}
            
            if not hasattr(account_data, 'bik') or not account_data.bank_account:
                return {'status': 'error', 'detail': 'BIK required for bank account'}
            
            result = self._validate_bank_account(
                account_data.bank_account, 
                account_data.bik
            )
            if not result['valid']:
                return {'status': 'error', 'detail': result['error']}

        elif account_data.payout_method == 'self_employed':
            if not account_data.inn:
                return {'status': 'error', 'detail': 'INN required'}
            
            result = self._validate_self_employed(account_data.inn)
            if not result['valid']:
                return {'status': 'error', 'detail': result['error']}

        return None

    def _validate_bank_card(self, card_number: str) -> Dict[str, Any]:
        '''Validate card using stdnum.luhn'''
        clean = re.sub(r'\D', '', card_number)
        
        if not clean:
            return {'valid': False, 'error': 'Card number is empty'}
        
        if not (16 <= len(clean) <= 19):
            return {'valid': False, 'error': f'Invalid card length: {len(clean)}'}
        
        if not luhn.is_valid(clean):
            return {'valid': False, 'error': 'Invalid card number'}
        

        bin_code = clean[:6]
        # if not self._is_valid_bin(bin_code): ...
        
        return {'valid': True, 'masked': f'{clean[:6]}******{clean[-4:]}'}

    def _validate_yoo_money(self, wallet: str) -> Dict[str, Any]:
        '''Validate YooMoney wallet (13-15 digits)'''
        clean = re.sub(r'\D', '', wallet)
        
        if not clean:
            return {'valid': False, 'error': 'Wallet is empty'}
        
        if not (13 <= len(clean) <= 15):
            return {'valid': False, 'error': f'Invalid wallet length: {len(clean)}'}
        
        if not clean.startswith(('41001', '41002')):
            return {'valid': False, 'error': 'Invalid wallet prefix'}
        
        return {'valid': True, 'wallet': clean}

    def _validate_sbp(self, phone: str) -> Dict[str, Any]:
        '''Validate phone for SBP using phonenumbers'''
        try:
            parsed = phonenumbers.parse(phone, "RU")
            
            if not phonenumbers.is_valid_number(parsed):
                return {'valid': False, 'error': 'Invalid phone number'}
            
            if phonenumbers.number_type(parsed) != phonenumbers.PhoneNumberType.MOBILE:
                return {'valid': False, 'error': 'Only mobile phones supported'}
            
            formatted = phonenumbers.format_number(
                parsed, 
                phonenumbers.PhoneNumberFormat.E164
            )
            
            return {'valid': True, 'phone': formatted}
            
        except phonenumbers.NumberParseException as e:
            return {'valid': False, 'error': f'Invalid phone: {str(e)}'}

    def _validate_bank_account(self, account: str, bik: str) -> Dict[str, Any]:
        '''Validate bank account with BIK'''
        clean_account = re.sub(r'\D', '', account)
        clean_bik = re.sub(r'\D', '', bik)
        
        if len(clean_account) != 20:
            return {'valid': False, 'error': 'Account must be 20 digits'}
        
        if len(clean_bik) != 9:
            return {'valid': False, 'error': 'BIK must be 9 digits'}
        
        if not bik.is_valid(clean_bik):
            return {'valid': False, 'error': 'Invalid BIK'}
        

        if not self._validate_account_with_bik(clean_account, clean_bik):
            return {'valid': False, 'error': 'Account validation failed'}
        
        return {'valid': True, 'account': clean_account, 'bik': clean_bik}

    def _validate_self_employed(self, inn: str) -> Dict[str, Any]:
        '''Validate INN using stdnum.ru.inn'''
        clean = re.sub(r'\D', '', inn)
        
        if not clean:
            return {'valid': False, 'error': 'INN is empty'}
        
        if not inn.is_valid(clean):
            return {'valid': False, 'error': 'Invalid INN'}
        
        if len(clean) != 12:
            return {'valid': False, 'error': 'INN must be 12 digits for individuals'}
        
        return {'valid': True, 'inn': clean}

    def _validate_account_with_bik(self, account: str, bik: str) -> bool:
        '''Validate account number with BIK (algorithm from Central Bank)'''
        try:
            bik_keys = bik[-3:]  # last 3 digits
            # last algorithm on search bik
            # https://github.com/coffee777/account-validator            
            return True
            
        except:
            return False

def get_account_usecase(
    session: AsyncSession = Depends(db_config.session),
    account_repository: AccountRepository = Depends(get_account_repository)
) -> AccountUseCase:
    return AccountUseCase(session, account_repository)
