from fastapi import APIRouter, Depends, status

from ..schemas import CreateAccountModel, AccountResponse, UpdateAccountModel
from ..usecases import AccountUseCase, get_account_usecase
from ...common.utils import (
    JWTManager,
    Exceptions400,
    NotFoundException404
)

account_app = APIRouter(prefix='/accounts', tags=['Accounts'])


@account_app.post(
    '/',
    status_code=status.HTTP_201_CREATED,
    summary='Create account',
    description='Creates a payout account for the current user'
)
async def create_account(
    account_data: CreateAccountModel,
    account_usecase: AccountUseCase = Depends(get_account_usecase),
    user=Depends(JWTManager.auth_required)
):
    result = await account_usecase.create_account(
        user_id=int(user.get('id')),
        account_data=account_data
    )

    if result.get('status') == 'error':
        await Exceptions400.creating_error(result.get('detail', 'Error creating account'))

    return {
        'status': 'created',
        'id': result.get('account').id
    }


@account_app.get(
    '/',
    response_model=AccountResponse,
    summary='Get user account',
    description='Returns the payout account for the current user'
)
async def get_account(
    account_usecase: AccountUseCase = Depends(get_account_usecase),
    user=Depends(JWTManager.auth_required)
):
    result = await account_usecase.get_account_by_user_id(
        user_id=int(user.get('id'))
    )

    if result.get('status') == 'error':
        await NotFoundException404.not_found('Account not found')

    return result.get('account')


@account_app.patch(
    '/',
    response_model=AccountResponse,
    summary='Update account',
    description='Updates the payout account for the current user'
)
async def update_account(
    account_data: UpdateAccountModel,
    account_usecase: AccountUseCase = Depends(get_account_usecase),
    user=Depends(JWTManager.auth_required)
):
    result = await account_usecase.update_account(
        user_id=int(user.get('id')),
        account_data=account_data
    )

    if result.get('status') == 'error':
        await Exceptions400.creating_error(result.get('detail', 'Error updating account'))

    return result.get('account')

