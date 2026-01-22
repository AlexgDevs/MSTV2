from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel


PayoutMethod = Literal['bank_card', 'yoo_money',
                    'sbp', 'bank_account', 'self_employed']
AccountStatus = Literal['pending', 'verified', 'rejected']


class CreateAccountModel(BaseModel):
    payout_method: PayoutMethod = 'bank_card'
    card_number: Optional[str] = None
    bank_account: Optional[str] = None
    yoomoney_wallet: Optional[str] = None
    phone: Optional[str] = None
    full_name: str
    inn: Optional[str] = None


class UpdateAccountModel(BaseModel):
    payout_method: Optional[PayoutMethod] = None
    card_number: Optional[str] = None
    bank_account: Optional[str] = None
    yoomoney_wallet: Optional[str] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None
    inn: Optional[str] = None
    is_active: Optional[bool] = None


class AccountResponse(BaseModel):
    id: int
    payout_method: PayoutMethod
    card_number: Optional[str]
    bank_account: Optional[str]
    yoomoney_wallet: Optional[str]
    phone: Optional[str]
    full_name: str
    inn: Optional[str]
    status: AccountStatus
    is_active: bool
    created_at: datetime
    updated_at: datetime
    user_id: int

    class Config:
        from_attributes = True
