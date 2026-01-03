from enum import Enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Literal, Optional

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    func,
)

if TYPE_CHECKING:
    from .user import User
    from .service import Service

from .. import Base


PayoutMethod = Literal['bank_card', 'yoo_money', 'sbp', 'bank_account', 'self_employed']
AccountStatus = Literal['pending', 'verified', 'rejected']


class Account(Base):
    __tablename__ = 'accounts'
    
    payout_method: Mapped[PayoutMethod] = mapped_column(
        default='bank_card', 
        nullable=False
    )
    
    card_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    bank_account: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  
    yoomoney_wallet: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    inn: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    
    status: Mapped[AccountStatus] = mapped_column(
        default='pending'
    )
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey('users.id', ondelete="CASCADE"), 
        unique=True, 
        nullable=False
    )

    user: Mapped['User'] = relationship(
        'User', 
        back_populates='account', 
        uselist=False)

    def get_yookassa_payout_data(self) -> dict:
        if self.payout_method == 'bank_card' and self.card_number:
            return {
                "type": "bank_card",
                "bank_card": {"number": self.card_number}
            }
        elif self.payout_method == 'yoo_money' and self.yoomoney_wallet:
            return {
                "type": "yoo_money", 
                "yoo_money": {"account_number": self.yoomoney_wallet}
            }
        elif self.payout_method == 'sbp' and self.phone:
            return {
                "type": "sbp",
                "sbp": {"phone": self.phone}
            }
        elif self.payout_method == 'bank_account' and self.bank_account:
            return {
                "type": "bank_account",
                "bank_account": {"account_number": self.bank_account}
            }
        elif self.payout_method == 'self_employed' and self.inn:
            return {
                "type": "self_employed",
                "self_employed": {"id": self.inn}
            }
        raise ValueError(f"No valid payout details for method {self.payout_method}")