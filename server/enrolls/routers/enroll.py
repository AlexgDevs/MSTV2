from typing import List

from fastapi import APIRouter, Query, Depends, status
from jose import jwt

from ..schemas import CreateEnrollModel
from ..repositories import get_enroll_repository, EnrollRepository
from ..usecases import BookingUseCase, get_booking_usecase
from ...users.repositories import get_user_repository, UserRepository

from ...common.utils import (
    JWTManager,
    Exceptions400,
    NotFoundException404,
    Exceptions403
)
enroll_app = APIRouter(prefix='/enrolls', tags=['Enrolls'])


@enroll_app.post('/',
                 status_code=status.HTTP_201_CREATED,
                 summary='enroll user',
                 description='endpoint for enrolling user'
                 )
async def create_enroll(
    enroll_data: CreateEnrollModel,
    booking_usecase: BookingUseCase = Depends(get_booking_usecase),
    user=Depends(JWTManager.auth_required),
):

    new_enroll = await booking_usecase.create_book(
        int(user.get('id')),
        enroll_data
    )

    if isinstance(new_enroll, dict):
        await Exceptions400.creating_error(str(new_enroll.get('detail')))

    return {'status': 'enrolled'}


@enroll_app.post('/{enroll_id}/cancel',
summary='cancel enroll by id',
description='endpoint for canceling enroll by id'
)
async def cancel_enroll(
    enroll_id: int,
    user = Depends(JWTManager.auth_required),
    booking_usecase: BookingUseCase = Depends(get_booking_usecase)
):
    cancel_exiting = await booking_usecase.cancel_book(
        enroll_id,
        int(user.get('id'))
    )

    if isinstance(cancel_exiting, dict):
        await Exceptions400.creating_error(str(cancel_exiting.get('detail')))

    return cancel_exiting
