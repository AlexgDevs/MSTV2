from typing import List

from fastapi import APIRouter, Query, Depends, status

from ..schemas import CreateScheduleTemplateModel, PatchScheduleTemplateModel, ScheduleTemplateDetailResponse, ScheduleTemplateResponse
from ..usecases import get_schedule_template_use_case, ScheduleTemplateUseCase
from ..repositories import get_schedule_template_repository, ScheduleTemplateRepository

from ...users.repositories import get_user_repository, UserRepository
from ...services.repositories import get_service_repository, ServiceRepository

from ...common.utils import (
    JWTManager,
    Exceptions400,
    NotFoundException404,
    Exceptions403
)

template_app = APIRouter(prefix='/templates', tags=['Templates'])


@template_app.post('/',
                status_code=status.HTTP_201_CREATED,
                summary='create date template',
                description='endpoint for creating schedule templates')
async def create_template(
        template_data: CreateScheduleTemplateModel,
        user=Depends(JWTManager.auth_required),
        service_repository: ServiceRepository = Depends(get_service_repository),
        template_use_case: ScheduleTemplateUseCase = Depends(get_schedule_template_use_case)
) -> dict:

    service_exiting = await service_repository.get_by_service_user_id(
        template_data.service_id,
        int(user.get('id'))
    )

    if not service_exiting:
        return {'status': 'failed', 'detail': 'service not found'}

    exiting = await template_use_case.create_template(
        int(user.get('id')),
        template_data
    )

    if isinstance(exiting, dict):
        await Exceptions400.creating_error(str(exiting.get('detail')))

    return {'status': 'created'}


@template_app.patch('/{template_id}',
                    summary='change template source',
                    description='endpoint for changed template source')
async def patch_change_template(
        template_id: int,
        template_data: PatchScheduleTemplateModel,
        user=Depends(JWTManager.auth_required),
        template_use_case: ScheduleTemplateUseCase = Depends(get_schedule_template_use_case)
        ):

    exiting = await template_use_case.update_template(
        template_id,
        int(user.get('id')),
        template_data,
    )

    if isinstance(exiting, dict):
        await Exceptions400.creating_error(str(exiting.get('detail')))

    return {'status': 'patch change success'}


@template_app.get('/',
                response_model=List[ScheduleTemplateResponse],
                summary='get all templates',
                description='endpoint for getting all schedule templates')
async def all_templates_response(
    template_repo: ScheduleTemplateRepository = Depends(get_schedule_template_repository)
):
    templates = await template_repo.get_all()
    return templates


@template_app.get('/{template_id}',
                response_model=ScheduleTemplateResponse,
                summary='get template by id',
                description='endpoint for getting date template by id')
async def template_by_id_response(
    template_id: int,
    template_repo: ScheduleTemplateRepository = Depends(get_schedule_template_repository)
    ):

    template = await template_repo.get_by_id(template_id)
    if not template:
        await NotFoundException404.template_not_found()

    return template


@template_app.get('/by/{service_id}',
                response_model=List[ScheduleTemplateResponse],
                summary='get all templates by user and service',
                description='endpoint for getting templates by user and service')
async def template_by_user_id(
    service_id: int,
    user = Depends(JWTManager.auth_required),
    template_repo: ScheduleTemplateRepository = Depends(get_schedule_template_repository)
) -> List[ScheduleTemplateResponse]:

    templates = await template_repo.get_all_by_service_user_id(
        service_id,
        int(user.get('id'))
    )

    return templates


@template_app.delete('/{template_id}',
                    summary='delete template',
                    description='endpoint for deleting schedule template')
async def delete_template(
    template_id: int,
    user=Depends(JWTManager.auth_required),
    template_use_case: ScheduleTemplateUseCase = Depends(get_schedule_template_use_case)
):

    result = await template_use_case.delete_template(
        template_id,
        int(user.get('id'))
    )

    if isinstance(result, dict):
        await Exceptions400.creating_error(str(result.get('detail')))

    return {'status': 'deleted'}