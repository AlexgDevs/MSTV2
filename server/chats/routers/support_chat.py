from fastapi import APIRouter, Depends, status
from typing import List
from ..schemas import CreatedSupportChat, SupportChatResponse, DetailSupportChatResponse
from ..usecases import get_support_chat_usecase, SupportChatUsecase
from ..repository import get_support_chat_repository, SupportChatRepository
from ...common.utils import JWTManager, Exceptions400, NotFoundException404

support_chat_app = APIRouter(prefix='/support-chats', tags=['Support Chats'])

@support_chat_app.post('/',
                       status_code=status.HTTP_201_CREATED,
                       summary='create support chat',
                       description='endpoint for creating support chat')
async def create_support_chat(
    support_chat_data: CreatedSupportChat,
    support_chat_usecase: SupportChatUsecase = Depends(get_support_chat_usecase),
    user: dict = Depends(JWTManager.auth_required)
) -> dict:
    new_chat = await support_chat_usecase.create_support_chat(support_chat_data, int(user.get('id')))
    if isinstance(new_chat, dict):
        await Exceptions400.creating_error(str(new_chat.get('detail')))
    return {'status': 'created', 'id': new_chat.id}


@support_chat_app.get('/',
                      response_model=List[SupportChatResponse],
                      summary='get all support chats',
                      description='endpoint for getting all support chats')
async def get_all_support_chats(
    support_chat_repository: SupportChatRepository = Depends(get_support_chat_repository),
    user: dict = Depends(JWTManager.auth_required)
) -> dict:
    chats = await support_chat_repository.get_all_by_user_id(int(user.get('id')))
    if not chats:
        return []

    all_chats = list(chats.get('client_chats', [])) + list(chats.get('support_chats', []))
    return all_chats

@support_chat_app.get('/{chat_id}',
                      response_model=DetailSupportChatResponse,
                      summary='get detail support chat',
                      description='endpoint for getting detail support chat')
async def get_detail_support_chat(
    chat_id: int,
    support_chat_repository: SupportChatRepository = Depends(get_support_chat_repository),
    user: dict = Depends(JWTManager.auth_required)
) -> dict:
    chat = await support_chat_repository.get_detail_by_user_chat_id(int(user.get('id')), chat_id)
    if not chat:
        await NotFoundException404.chat_not_found()
    return chat


@support_chat_app.delete('/{chat_id}',
                       summary='delete support chat',
                       description='endpoint for deleting support chat')
async def delete_support_chat(
    chat_id: int,
    support_chat_usecase: SupportChatUsecase = Depends(get_support_chat_usecase),
    user: dict = Depends(JWTManager.auth_required)
) -> dict:
    await support_chat_usecase.delete_support_chat(int(user.get('id')), chat_id)
    return {'status': 'deleted'}