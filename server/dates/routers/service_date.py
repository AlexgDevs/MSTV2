from typing import List

from fastapi import APIRouter, Query, Depends, status

from ..schemas import CreateServiceDate, ServiceDateResponse
from ..repositories import ServiceDateRepository, get_service_date_repository
from ..usecases import get_service_date_use_case, ServiceDateUseCase

from ...common.utils import JWTManager, Exceptions400

service_date_app = APIRouter(prefix='/dates', tags=['Service Dates'])


@service_date_app.post('/',
                    status_code=status.HTTP_201_CREATED,
                    summary='create service date',
                    description='endpoint for creating service date in handing')
async def create_service_date(
    service_date_data: CreateServiceDate,
    user=Depends(JWTManager.auth_required),
    service_date_usecase: ServiceDateUseCase = Depends(
        get_service_date_use_case)
):

    exiting = await service_date_usecase.create_service_date(
        int(user.get('id')),
        service_date_data
    )

    if isinstance(exiting, dict):
        await Exceptions400.creating_error(str(exiting.get('detail')))

    return {'status': 'created'}


@service_date_app.get('/',
                    response_model=List[ServiceDateResponse],
                    summary='get all dates',
                    description='endpoint for getting all dates')
async def get_all_dates(
    service_date_repo: ServiceDateRepository = Depends(
        get_service_date_repository)
):
    dates = await service_date_repo.get_all()
    return dates
