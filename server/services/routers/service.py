from typing import List

from fastapi import APIRouter, Query, Depends, status

from ..schemas import ServiceResponse, CreateServiceModel, PatchServiceModel, DetailServiceResponse
from ..usecases import get_service_usecase, ServiceUseCase
from ..repositories import get_service_repository, ServiceRepository

from ...users.repositories import get_user_repository, UserRepository

from ...common.utils import (
    JWTManager,
    Exceptions400,
    NotFoundException404,
    Exceptions403
)

service_app = APIRouter(prefix='/services', tags=['Service'])


@service_app.get('/',
                 response_model=List[ServiceResponse],
                 summary='get all services',
                 description='endpoint for getting all services')
async def all_services_response(
    service_repo: ServiceRepository = Depends(get_service_repository)
) -> List[ServiceResponse]:
    services = await service_repo.get_all()
    return services


@service_app.get('/{service_id}',
                 response_model=ServiceResponse,
                 summary='get service',
                 description='endpoint for getting service by id')
async def get_service_by_id(
    service_id: int,
    service_repo: ServiceRepository = Depends(get_service_repository)
) -> ServiceResponse:

    service = await service_repo.get_by_id(service_id)
    if not service:
        await NotFoundException404.service_not_found()

    return service


@service_app.get('/detail/{service_id}',
                 response_model=DetailServiceResponse,
                 summary='get detail service',
                 description='endpoint for getting detail service'
                 )
async def get_detail_service(
    service_id: int,
    user=Depends(JWTManager.auth_required),
    service_repo: ServiceRepository = Depends(get_service_repository)
):
    service = await service_repo.get_detail_by_service_id(
        service_id
    )

    if not service:
        await NotFoundException404.service_not_found()

    return service


@service_app.post('/',
                  status_code=status.HTTP_201_CREATED,
                  summary='create service',
                  description='endpoint for creating service')
async def create_service(
    service_data: CreateServiceModel,
    user=Depends(JWTManager.auth_required),
    service_usecase: ServiceUseCase = Depends(get_service_usecase),
    user_repo: UserRepository = Depends(get_user_repository)
):

    user_exit = await user_repo.get_by_id(
        int(user.get('id'))
    )

    if not user_exit.verified_email:
        await Exceptions403.email_not_verified()

    exiting = await service_usecase.create_service(
        int(user.get('id')),
        service_data
    )

    if isinstance(exiting, dict):
        await Exceptions400.creating_error(str(exiting.get('detail')))

    return {'status': 'created'}


@service_app.patch('/{service_id}',
                   summary='change service source',
                   description='endpoint for changed service source')
async def patch_update_service(
    service_id: int,
    service_update_data: PatchServiceModel,
    user=Depends(JWTManager.auth_required),
    service_usecase: ServiceUseCase = Depends(get_service_usecase)
):

    exiting = await service_usecase.update_service(
        int(user.get('id')),
        service_id,
        service_update_data
    )

    if isinstance(exiting, dict):
        await Exceptions400.creating_error(str(exiting.get('detail')))

    return {'status': 'success updating'}
