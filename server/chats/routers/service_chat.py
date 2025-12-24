from fastapi import APIRouter, Depends, status
from typing import List
from ..schemas import CreatedServiceChat, ServiceChatResponse, DetailServiceChat
from ..usecases import get_service_chat_usecase, ServiceChatUsecase
from ..repository import get_service_chat_repository, ServiceChatRepository
from ...common.utils import Exceptions400, JWTManager

service_chat_app = APIRouter(prefix='/service-chats', tags=['Service Chats'])

@service_chat_app.post('/',
                       status_code=status.HTTP_201_CREATED,
                       summary='create service chat',
                       description='endpoint for creating service chat')
async def create_service_chat(
    service_chat_data: CreatedServiceChat,
    service_chat_usecase: ServiceChatUsecase = Depends(get_service_chat_usecase),
    user: dict = Depends(JWTManager.auth_required)

) -> dict:
    new_chat = await service_chat_usecase.create_service_chat(service_chat_data, int(user.get('id')))
    if isinstance(new_chat, dict):
        await Exceptions400.creating_error(str(new_chat.get('detail')))

    return {'status': 'created', 'id': new_chat.id}


@service_chat_app.get('/',
                       response_model=List[ServiceChatResponse],
                       summary='get all service chats',
                       description='endpoint for getting all service chats')
async def get_all_service_chats(
    service_chat_repository: ServiceChatRepository = Depends(get_service_chat_repository),
    user: dict = Depends(JWTManager.auth_required)
) -> dict:
    chats = await service_chat_repository.get_all_by_user_id(int(user.get('id')))
    if not chats:
        return []

    all_chats = list(chats.get('client_chats', [])) + list(chats.get('master_chats', []))
    return all_chats


@service_chat_app.get('/{chat_id}',
                       response_model=DetailServiceChat,
                       summary='get detail service chat',
                       description='endpoint for getting detail service chat')
async def get_detail_service_chat(
    chat_id: int,
    service_chat_repository: ServiceChatRepository = Depends(get_service_chat_repository),
    user: dict = Depends(JWTManager.auth_required)
) -> dict:
    chat = await service_chat_repository.get_detail_by_user_chat_id(int(user.get('id')), chat_id)
    return chat


@service_chat_app.delete('/{chat_id}',
                       summary='delete service chat',
                       description='endpoint for deleting service chat')
async def delete_service_chat(
    chat_id: int,
    service_chat_usecase: ServiceChatUsecase = Depends(get_service_chat_usecase),
    user: dict = Depends(JWTManager.auth_required)
) -> dict:
    await service_chat_usecase.delete_service_chat(int(user.get('id')), chat_id)
    return {'status': 'deleted'}