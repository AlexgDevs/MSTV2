from typing import List

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    HTTPException,
    Response,
    status
)
from passlib.context import CryptContext

from ...common.utils import (
    CookieManager,
    JWTManager,
    TokenFactory,
    email_verfification_obj
)

from ...common.utils.exceptions import Exceptions400, NotFoundException404
from ..repositories import UserRepository, get_user_repository
from ..schemas import (
    CreateUserModel, 
    LoginUserModel,
    VerifiedEmailCodeModel
)

from ..usecases import (
    UserUseCase,
    get_user_use_case
)


auth_app = APIRouter(prefix='/auth', tags=['Auth'])
pwd_context = CryptContext(schemes=['argon2'], deprecated='auto')


@auth_app.post('/register',
               status_code=status.HTTP_201_CREATED,
               summary='create and adding tokens in coocking sesson',
               description='endpoint for creating and registered user')
async def registered_user(
    response: Response,
    user_data: CreateUserModel,
    guest=Depends(JWTManager.not_auth_required),
    user_use_case: UserUseCase = Depends(get_user_use_case)
) -> dict:
    user_exit = user_data.model_dump()
    user_exit['password'] = pwd_context.hash(user_data.password)
    verifi_code = await email_verfification_obj.create_enter_code()
    new_user = await user_use_case.create_user(CreateUserModel(**user_exit), verifi_code)
    if isinstance(new_user, dict):
        await Exceptions400.creating_error(str(new_user.get('detail')))

    email_verfification_obj.send_verification_code(new_user.email, new_user.verified_code)

    user_token_data = {
        'id': new_user.id,
        'name': new_user.name,
        'role': new_user.role,
    }

    access_token = await TokenFactory.create_access_token(user_token_data)
    refresh_token = await TokenFactory.create_refresh_token(user_token_data)

    await CookieManager.set_custom_cookies(
        response,
        access_token,
        refresh_token
    )

    return {
        'status': 'created',
        'tokens': {
            'access_token': access_token,
            'refresh_token': refresh_token
        }}


@auth_app.post('/token',
               status_code=status.HTTP_201_CREATED,
               summary='login user',
               description='endpoint for logined user and creating tokens')
async def token(
    response: Response,
    user_data: LoginUserModel,
    guest=Depends(JWTManager.not_auth_required),
    user_repository: UserRepository = Depends(get_user_repository),
):

    user_output = await user_repository.get_by_name(user_data.name)

    if not user_output:
        await NotFoundException404.user_not_found()

    if not pwd_context.verify(user_data.password, user_output.password):
        await Exceptions400.invalid_password()

    user_token_data = {
        'id': user_output.id,
        'name': user_output.name,
        'role': user_output.role
    }

    access_token = await TokenFactory.create_access_token(user_token_data)
    refresh_token = await TokenFactory.create_refresh_token(user_token_data)

    await CookieManager.set_custom_cookies(
        response,
        access_token,
        refresh_token
    )

    return {
        'status': 'logined',
        'tokens': {
            'access': access_token,
            'refresh': refresh_token
        }
    }


@auth_app.post('/refresh',
               summary='refresh access tokend',
               description='endpoint for creating new access token by refresh')
async def refresh_access_token(
        response: Response,
        refresh_token: str = Cookie(None)):

    new_access_token = await TokenFactory.access_by_refresh(refresh_token)
    await CookieManager.set_access(response, new_access_token)
    return {
        'status': 'refreshed',
        'tokens': {
            'access': new_access_token
        }
    }


@auth_app.get('/check',
              summary='check auth status')
async def check_auth_status(user=Depends(JWTManager.auth_required)):
    return {"status": "authenticated", "user_id": user.get('id')}


@auth_app.delete('/logout',
                 summary='logout account',
                 description='endpoint for deleting cookies')
async def logout(response: Response, is_auth=Depends(JWTManager.auth_required)):
    await CookieManager.delete_cookies(response)
    return {'status': 'cookies deleted'}


@auth_app.post('/verified_email',
summary='verfifed email',
description='endpoint for verifing code to email'
)
async def verified_email(
    enter_code: VerifiedEmailCodeModel,
    user = Depends(JWTManager.auth_required),
    user_usecase: UserUseCase = Depends(get_user_use_case)
):
    exiting = await user_usecase.success_email_verification(
        int(user.get('id')),
        enter_code.code
    )

    if isinstance(exiting, dict):
        await Exceptions400.creating_error(str(exiting.get('detail')))

    return {'status': 'verifed success'}