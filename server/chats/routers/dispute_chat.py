from fastapi import APIRouter, Depends, status
from typing import List

from ..schemas.dispute_chat import (
    DisputeChatResponse,
    DetailDisputeChatResponse,
    CreateDisputeChatRequest
)
from ..usecases import get_dispute_chat_usecase, DisputeChatUsecase
from ..repository import get_dispute_chat_repository, DisputeChatRepository
from ...common.utils import JWTManager, Exceptions400, NotFoundException404

dispute_chat_app = APIRouter(prefix='/dispute-chats', tags=['Dispute Chats'])


@dispute_chat_app.post('/',
                       status_code=status.HTTP_201_CREATED,
                       summary='create dispute chat',
                       description='endpoint for creating dispute chat')
async def create_dispute_chat(
    chat_data: CreateDisputeChatRequest,
    dispute_chat_usecase: DisputeChatUsecase = Depends(
        get_dispute_chat_usecase),
    user: dict = Depends(JWTManager.auth_required)
) -> dict:
    new_chat = await dispute_chat_usecase.create_dispute_chat(chat_data.dispute_id)
    if isinstance(new_chat, dict):
        await Exceptions400.creating_error(str(new_chat.get('detail')))
    return {'status': 'created', 'id': new_chat.id}


@dispute_chat_app.get('/',
                      response_model=List[DisputeChatResponse],
                      summary='get all dispute chats',
                      description='endpoint for getting all dispute chats')
async def get_all_dispute_chats(
    dispute_chat_repository: DisputeChatRepository = Depends(
        get_dispute_chat_repository),
    user: dict = Depends(JWTManager.auth_required)
) -> List[DisputeChatResponse]:
    chats = await dispute_chat_repository.get_all_by_user_id(int(user.get('id')))
    return chats


@dispute_chat_app.get('/{chat_id}',
                      response_model=DetailDisputeChatResponse,
                      summary='get detail dispute chat',
                      description='endpoint for getting detail dispute chat')
async def get_detail_dispute_chat(
    chat_id: int,
    dispute_chat_repository: DisputeChatRepository = Depends(
        get_dispute_chat_repository),
    user: dict = Depends(JWTManager.auth_required)
) -> DetailDisputeChatResponse:
    user_id = int(user.get('id'))
    chat = await dispute_chat_repository.get_detail_by_id(chat_id)

    if not chat:
        await NotFoundException404.not_found('Chat not found')

    is_master = chat.master_id == user_id
    is_client = chat.client_id == user_id
    is_arbitr = chat.arbitr_id is not None and chat.arbitr_id == user_id

    if not (is_master or is_client or is_arbitr):
        await Exceptions400.creating_error('Access denied')

    return chat


@dispute_chat_app.get('/by-dispute/{dispute_id}',
                      response_model=DetailDisputeChatResponse,
                      summary='get dispute chat by dispute id',
                      description='endpoint for getting dispute chat by dispute id')
async def get_dispute_chat_by_dispute_id(
    dispute_id: int,
    dispute_chat_repository: DisputeChatRepository = Depends(
        get_dispute_chat_repository),
    user: dict = Depends(JWTManager.auth_required)
) -> DetailDisputeChatResponse:
    chat = await dispute_chat_repository.get_by_dispute_id(dispute_id)

    if not chat:
        await NotFoundException404.not_found('Chat not found')

    user_id = int(user.get('id'))
    is_master = chat.master_id == user_id
    is_client = chat.client_id == user_id
    is_arbitr = chat.arbitr_id is not None and chat.arbitr_id == user_id

    if not (is_master or is_client or is_arbitr):
        await Exceptions400.creating_error('Access denied')

    detail_chat = await dispute_chat_repository.get_detail_by_id(chat.id)
    if not detail_chat:
        await NotFoundException404.not_found('Chat not found')

    return detail_chat
