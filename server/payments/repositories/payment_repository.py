from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ...common import db_config
from ...common.db.models.payment import Payment
from ...common.db.models.service import ServiceEnroll, Service
from ...common.db.models.user import User
from ...common.db.models.date import ServiceDate


class PaymentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, payment_id: int) -> Payment | None:
        payment = await self._session.scalar(
            select(Payment)
            .where(Payment.id == payment_id)
            .options(selectinload(Payment.enroll))
        )
        return payment

    async def get_by_yookassa_id(self, yookassa_payment_id: str) -> Payment | None:
        payment = await self._session.scalar(
            select(Payment)
            .where(Payment.yookassa_payment_id == yookassa_payment_id)
            .options(selectinload(Payment.enroll))
        )
        return payment

    async def get_by_enroll_id(self, enroll_id: int) -> Payment | None:
        payment = await self._session.scalar(
            select(Payment)
            .where(Payment.enroll_id == enroll_id)
            .options(selectinload(Payment.enroll))
        )
        return payment

    async def get_by_user_id(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> list[Payment]:
        payments = await self._session.scalars(
            select(Payment)
            .join(ServiceEnroll, Payment.enroll_id == ServiceEnroll.id)
            .where(ServiceEnroll.user_id == user_id)
            .order_by(Payment.created_at.desc())
            .limit(limit)
            .offset(offset)
            .options(
                selectinload(Payment.enroll).selectinload(
                    ServiceEnroll.service).selectinload(Service.user),
                selectinload(Payment.enroll).selectinload(
                    ServiceEnroll.service_date)
            )
        )
        return payments.all()

    async def get_seller_id(
            self,
            seller_id: int):

        seller = await self._session.scalar(
            select(User)
            .where(User.id == seller_id)
            .options(selectinload(User.account))
        )

        return seller

    async def create_payment(
        self,
        enroll_id: int,
        amount: int,
        yookassa_payment_id: str | None = None,
        yookassa_status: str | None = None,
        description: str | None = None,
        confirmation_url: str | None = None,
        payment_metadata: str | None = None
    ) -> Payment:
        new_payment = Payment(
            enroll_id=enroll_id,
            amount=amount,
            currency='RUB',
            yookassa_payment_id=yookassa_payment_id,
            yookassa_status=yookassa_status,
            description=description,
            confirmation_url=confirmation_url,
            payment_metadata=payment_metadata,
            status='pending'
        )
        self._session.add(new_payment)
        await self._session.flush()
        return new_payment

    async def update_payment(
        self,
        payment_id: int,
        yookassa_status: str | None = None,
        status: str | None = None,
        confirmation_url: str | None = None,
        paid_at: str | None = None
    ) -> Payment | None:
        payment = await self.get_by_id(payment_id)
        if not payment:
            return None

        if yookassa_status:
            payment.yookassa_status = yookassa_status
        if status:
            payment.status = status
        if confirmation_url:
            payment.confirmation_url = confirmation_url
        if paid_at:
            from datetime import datetime
            payment.paid_at = datetime.fromisoformat(
                paid_at.replace('Z', '+00:00'))

        await self._session.flush()
        return payment


def get_payment_repository(
    session: AsyncSession = Depends(db_config.session)
) -> PaymentRepository:
    return PaymentRepository(session)

#demo hold mvp confirm