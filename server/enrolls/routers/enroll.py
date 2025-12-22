from typing import List

from fastapi import APIRouter, Query, Depends, status
from jose import jwt

from ..schemas import CreateEnrollModel, EnrollResponse
from ..repositories import get_enroll_repository, EnrollRepository
from ..usecases import BookingUseCase, get_booking_usecase
from ...users.repositories import get_user_repository, UserRepository
from ...services.repositories import get_service_repository, ServiceRepository

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
                 description='endpoint for enrolling user')
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

    return {'status': 'enrolled', 'enroll_id': new_enroll.id}


@enroll_app.post('/{enroll_id}/cancel',
                 summary='cancel enroll by id',
                 description='endpoint for canceling enroll by id')
async def cancel_enroll(
    enroll_id: int,
    user=Depends(JWTManager.auth_required),
    booking_usecase: BookingUseCase = Depends(get_booking_usecase)
):
    cancel_exiting = await booking_usecase.cancel_book(
        enroll_id,
        int(user.get('id'))
    )

    if isinstance(cancel_exiting, dict):
        await Exceptions400.creating_error(str(cancel_exiting.get('detail')))

    return cancel_exiting


@enroll_app.get('/service/{service_id}',
                response_model=List[EnrollResponse],
                summary='get enrolls by service id',
                description='endpoint for getting enrolls by service id')
async def get_enrolls_by_service(
    service_id: int,
    user=Depends(JWTManager.auth_required),
    enroll_repo: EnrollRepository = Depends(get_enroll_repository),
    service_repo: ServiceRepository = Depends(get_service_repository)
):
    """
    Получает все записи для указанной услуги.
    Доступно только владельцу услуги.
    """
    service = await service_repo.get_by_id(service_id)

    if not service:
        await NotFoundException404.service_not_found()

    if service.user_id != int(user.get('id')):
        await Exceptions403.forbidden()

    enrolls = await enroll_repo.get_by_service_id(service_id)
    return enrolls


@enroll_app.post('/{enroll_id}/process/{action}',
                 summary='accept or reject pending status in enroll',
                 description='endpoint for accepting or rejecting status enroll')
async def change_enroll_status(
    enroll_id: int,
    action: str,
    user=Depends(JWTManager.auth_required),
    booking_usecase: BookingUseCase = Depends(get_booking_usecase)
):
    if action not in ['accept', 'reject']:
        await Exceptions400.creating_error('Invalid action. Use "accept" or "reject"')

    result = await booking_usecase.change_enroll_status(
        enroll_id,
        int(user.get('id')),
        action
    )

    if isinstance(result, dict):
        await Exceptions400.creating_error(str(result.get('detail')))

    return {'status': 'success', 'enroll_status': result.status}
