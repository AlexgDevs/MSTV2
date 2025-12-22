from fastapi import APIRouter, Depends, Request, status
from jose import jwt

from ..schemas import (
    CreatePaymentModel,
    PaymentResponse,
    PaymentStatusResponse,
    YooKassaWebhookModel
)
from ..usecases import PaymentUseCase, get_payment_usecase
from ...common.utils import (
    JWTManager,
    Exceptions400,
    NotFoundException404
)
from ...common.utils.rate_limiter_config import create_rate_limiter, SERVICE_RATE_LIMIT

payment_app = APIRouter(prefix='/payments', tags=['Payments'])


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
