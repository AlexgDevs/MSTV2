from typing import List

from fastapi import APIRouter, Query, Depends, status

from ..schemas import ServiceResponse, CreateServiceModel, PatchServiceModel
from ..usecases import get_service_usecase, ServiceUseCase
from ..repositories import get_service_repository, ServiceRepository

from ...common.utils import (
    JWTManager,
    Exceptions400
)

service_app = APIRouter(prefix='/services', tags=['Service'])

@service_app.get('/',
                response_model=List[ServiceResponse],
                summary='get all services',
                description='endpoint for getting all services')
async def all_services_response(
    service_repo: ServiceRepository = Depends(get_service_repository)
):
    services = await service_repo.get_all()
    return services


@service_app.post('/',
                status_code=status.HTTP_201_CREATED,
                summary='create service',
                description='endpoint for creating service')
async def create_service(
    service_data: CreateServiceModel,
    user = Depends(JWTManager.auth_required),
    service_usecase: ServiceUseCase = Depends(get_service_usecase)
):

    exiting = await service_usecase.create_service(
        int(user.get('id')),
        service_data
    )

    if isinstance(exiting, dict):
        await Exceptions400.creating_error(str(exiting.get('detail')))

    return {'status': 'created'}