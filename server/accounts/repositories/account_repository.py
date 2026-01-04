from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ...common import db_config
from ...common.db.models.accounts import Account
from ...common.db.models.user import User


class AccountRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, account_id: int) -> Account | None:
        account = await self._session.scalar(
            select(Account)
            .where(Account.id == account_id)
            .options(selectinload(Account.user))
        )
        return account

    async def get_by_user_id(self, user_id: int) -> Account | None:
        account = await self._session.scalar(
            select(Account)
            .where(Account.user_id == user_id)
            .options(selectinload(Account.user))
        )
        return account

    async def create_account(
        self,
        user_id: int,
        payout_method: str,
        full_name: str,
        card_number: str | None = None,
        bank_account: str | None = None,
        yoomoney_wallet: str | None = None,
        phone: str | None = None,
        inn: str | None = None
    ) -> Account:
        new_account = Account(
            user_id=user_id,
            payout_method=payout_method,
            full_name=full_name,
            card_number=card_number,
            bank_account=bank_account,
            yoomoney_wallet=yoomoney_wallet,
            phone=phone,
            inn=inn,
            status='pending',
            is_active=True
        )
        self._session.add(new_account)
        await self._session.flush()
        return new_account

    async def update_account(
        self,
        account_id: int,
        payout_method: str | None = None,
        full_name: str | None = None,
        card_number: str | None = None,
        bank_account: str | None = None,
        yoomoney_wallet: str | None = None,
        phone: str | None = None,
        inn: str | None = None,
        is_active: bool | None = None
    ) -> Account | None:
        account = await self.get_by_id(account_id)
        if not account:
            return None

        if payout_method is not None:
            account.payout_method = payout_method
        if full_name is not None:
            account.full_name = full_name
        if card_number is not None:
            account.card_number = card_number
        if bank_account is not None:
            account.bank_account = bank_account
        if yoomoney_wallet is not None:
            account.yoomoney_wallet = yoomoney_wallet
        if phone is not None:
            account.phone = phone
        if inn is not None:
            account.inn = inn
        if is_active is not None:
            account.is_active = is_active

        await self._session.flush()
        return account


def get_account_repository(
    session: AsyncSession = Depends(db_config.session)
) -> AccountRepository:
    return AccountRepository(session)
