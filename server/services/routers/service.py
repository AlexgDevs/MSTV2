from typing import List, Optional

from fastapi import APIRouter, Query, Depends, status, File, UploadFile, Form

from ..schemas import ServiceResponse, CreateServiceModel, PatchServiceModel, DetailServiceResponse
from ..usecases import get_service_usecase, ServiceUseCase
from ..repositories import get_service_repository, ServiceRepository
from ...users.repositories import get_user_repository, UserRepository
from ...accounts.repositories import get_account_repository, AccountRepository

from ...common.utils import (
    JWTManager,
    Exceptions400,
    NotFoundException404,
    Exceptions403,
    process_to_base64
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
                 description='endpoint for getting detail service')
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
    title: str = Form(...),
    description: str = Form(...),
    price: int = Form(...),
    photo: Optional[UploadFile] = File(None),
    photo_url: Optional[str] = Form(None),
    existing_tags: Optional[str] = Form(None),
    custom_tags: Optional[str] = Form(None),
    user=Depends(JWTManager.auth_required),
    service_usecase: ServiceUseCase = Depends(get_service_usecase),
    user_repo: UserRepository = Depends(get_user_repository),
    account_repo: AccountRepository = Depends(get_account_repository)
):

    user_exit = await user_repo.get_by_id(
        int(user.get('id'))
    )

    if not user_exit.verified_email:
        await Exceptions403.email_not_verified()

    # Check if user has an account for receiving payments
    account = await account_repo.get_by_user_id(int(user.get('id')))
    if not account:
        await Exceptions400.creating_error('Для создания услуги необходимо сначала создать счет для получения денег')

    photo_data = None
    if photo and photo.filename:
        photo_data = await process_to_base64(photo, max_size_mb=4)
        if not photo_data:
            await Exceptions400.creating_error('inavalid format or size photo')
    elif photo_url:
        photo_data = photo_url

    service_data = CreateServiceModel(
        title=title,
        description=description,
        price=price,
        photo=photo_data or ''
    )

    # Parse tags
    existing_tags_list = []
    custom_tags_list = []

    if existing_tags:
        try:
            import json
            existing_tags_list = json.loads(
                existing_tags) if existing_tags else []
        except Exception:
            existing_tags_list = []

    if custom_tags:
        try:
            import json
            custom_tags_list = json.loads(custom_tags) if custom_tags else []
        except Exception:
            custom_tags_list = []

    exiting = await service_usecase.create_service(
        int(user.get('id')),
        service_data,
        existing_tags=existing_tags_list,
        custom_tags=custom_tags_list
    )

    if isinstance(exiting, dict):
        await Exceptions400.creating_error(str(exiting.get('detail')))

    return {'status': 'created', 'id': exiting.id}


# @service_app.patch('/{service_id}',
#                    summary='change service source',
#                    description='endpoint for changed service source')
# async def patch_update_service(
#     service_id: int,
#     title: Optional[str] = Form(None),
#     description: Optional[str] = Form(None),
#     price: Optional[int] = Form(None),
#     photo: Optional[UploadFile] = File(None),
#     photo_url: Optional[str] = Form(None),
#     user=Depends(JWTManager.auth_required),
#     service_usecase: ServiceUseCase = Depends(get_service_usecase)
# ):

#     photo_data = None
#     if photo and photo.filename:
#         photo_data = await process_to_base64(photo, max_size_mb=4)
#         if not photo_data:
#             await Exceptions400.creating_error('Invalid image format or size exceeds 4 MB')
#     elif photo_url:
#         photo_data = photo_url

#     update_data = {}
#     if title is not None:
#         update_data['title'] = title
#     if description is not None:
#         update_data['description'] = description
#     if price is not None:
#         update_data['price'] = price
#     if photo_data is not None:
#         update_data['photo'] = photo_data

#     service_update_data = PatchServiceModel(**update_data)

#     exiting = await service_usecase.update_service(
#         int(user.get('id')),
#         service_id,
#         service_update_data
#     )

#     if isinstance(exiting, dict):
#         await Exceptions400.creating_error(str(exiting.get('detail')))

#     return {'status': 'success updating'}


@service_app.get('/by/{category_name}',
                 response_model=List[ServiceResponse])
async def get_by_category(
    category_name: str,
    service_repo: ServiceRepository = Depends(get_service_repository)
):

    services = await service_repo.get_all_by_category_name(category_name)
    return services


@service_app.delete('/{service_id}',
                    summary='delete service',
                    description='endpoint for deleting service')
async def delete_service(
    service_id: int,
    user=Depends(JWTManager.auth_required),
    service_usecase: ServiceUseCase = Depends(get_service_usecase)
):

    result = await service_usecase.delete_service(
        int(user.get('id')),
        service_id
    )

    if isinstance(result, dict):
        await Exceptions400.creating_error(str(result.get('detail')))

    return {'status': 'deleted'}
