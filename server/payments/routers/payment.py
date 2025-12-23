from datetime import datetime
from fastapi import APIRouter, Depends, Request, status
from jose import jwt

from ..schemas import (
    CreatePaymentModel,
    PaymentResponse,
    PaymentStatusResponse,
    PaymentServiceInfo,
    YooKassaWebhookModel
)
from ...common.utils.yookassa import verify_webhook_signature
from ..usecases import PaymentUseCase, get_payment_usecase
from ...common.utils import (
    JWTManager,
    Exceptions400,
    NotFoundException404
)
from ...common.utils.rate_limiter_config import create_rate_limiter, SERVICE_RATE_LIMIT

payment_app = APIRouter(prefix='/payments', tags=['Payments'])


@payment_app.get(
    '/',
    response_model=list[PaymentResponse],
    summary='Get user payments',
    description='Returns list of payments for current user'
)
async def get_user_payments(
    limit: int = 50,
    offset: int = 0,
    payment_usecase: PaymentUseCase = Depends(get_payment_usecase),
    limiter=Depends(create_rate_limiter(SERVICE_RATE_LIMIT)),
    user=Depends(JWTManager.auth_required)
):
    result = await payment_usecase.get_user_payments(
        user_id=int(user.get('id')),
        limit=limit,
        offset=offset
    )

    if result.get('status') == 'error':
        await Exceptions400.creating_error(result.get('detail', 'Error getting payments'))

    return [
        PaymentResponse(
            id=payment['id'],
            enroll_id=payment['enroll_id'],
            yookassa_payment_id=None,  # Not included in list for security
            amount=payment['amount'],
            currency=payment['currency'],
            status=payment['status'],
            description=payment['description'],
            confirmation_url=payment['confirmation_url'],
            created_at=datetime.fromisoformat(payment['created_at']),
            paid_at=datetime.fromisoformat(
                payment['paid_at']) if payment['paid_at'] else None,
            service=PaymentServiceInfo(
                **payment['service']) if payment.get('service') else None,
            enroll_date=payment.get('enroll_date'),
            enroll_time=payment.get('enroll_time')
        )
        for payment in result.get('payments', [])
    ]


@payment_app.post(
    '/',
    status_code=status.HTTP_201_CREATED,
    summary='Create payment',
    description='Creates payment for enrollment via YooKassa'
)
async def create_payment(
    request: Request,
    payment_data: CreatePaymentModel,
    payment_usecase: PaymentUseCase = Depends(get_payment_usecase),
    limiter=Depends(create_rate_limiter(SERVICE_RATE_LIMIT)),
    user=Depends(JWTManager.auth_required)
):
    base_url = str(request.base_url).rstrip('/')
    return_url = payment_data.return_url or f"{base_url}/payments/success"

    result = await payment_usecase.create_payment(
        user_id=int(user.get('id')),
        payment_data=payment_data,
        return_url=return_url
    )

    if result.get('status') == 'error':
        await Exceptions400.creating_error(result.get('detail', 'Payment creation error'))

    return {
        'payment_id': result.get('payment_id'),
        'confirmation_url': result.get('confirmation_url'),
        'yookassa_payment_id': result.get('yookassa_payment_id')
    }


@payment_app.get(
    '/{payment_id}/status',
    summary='Get payment status',
    description='Returns current payment status'
)
async def get_payment_status(
    payment_id: int,
    payment_usecase: PaymentUseCase = Depends(get_payment_usecase),
    limiter=Depends(create_rate_limiter(SERVICE_RATE_LIMIT)),
    user=Depends(JWTManager.auth_required)
):
    result = await payment_usecase.get_payment_status(
        payment_id=payment_id,
        user_id=int(user.get('id'))
    )

    if result.get('status') == 'error':
        await NotFoundException404.not_found(result.get('detail', 'Payment not found'))

    return PaymentStatusResponse(**result.get('payment', {}))


@payment_app.post(
    '/webhook',
    status_code=status.HTTP_200_OK,
    summary='YooKassa webhook',
    description='Processes payment status notifications from YooKassa'
)
async def yookassa_webhook(
    request: Request,
    payment_usecase: PaymentUseCase = Depends(get_payment_usecase)
):
    webhook_data = await request.json()

    # Verify webhook signature
    if not verify_webhook_signature(webhook_data):
        await Exceptions400.creating_error('Invalid webhook signature')

    result = await payment_usecase.handle_webhook(webhook_data)
    return {'status': 'ok'}


@payment_app.get(
    '/success',
    summary='Payment success page',
    description='Page user returns to after successful payment'
)
async def payment_success():
    return {
        'status': 'success',
        'message': 'Payment completed successfully'
    }
