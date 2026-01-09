from typing import List
from fastapi import APIRouter, Depends, status

from ..schemas import (
    CreateDisputeModel,
    DetailDisputRespone,
    DisputeResponse
)

from ..usecases import (
    DisputeUseCase,
    get_dispute_usecase
)

from ..repositories import (
    get_dispute_repository,
    DisputeRepository
)

from ...common.utils import (
    JWTManager,
    Exceptions400,
    NotFoundException404
)

dispute_app = APIRouter(prefix='/disputes', tags=['Disputes'])


@dispute_app.get('/',
                 summary='get all disputes',
                 description='endpoint for getting all disputes',
                 response_model=List[DisputeResponse])
async def get_all_disputes(
    dispute_repository: DisputeRepository = Depends(get_dispute_repository)
):
    disputes = await dispute_repository.get_all()
    disputes_list = list(disputes.all()) if hasattr(
        disputes, 'all') else list(disputes)
    return [
        DisputeResponse(
            id=d.id,
            client_id=d.client_id,
            master_id=d.master_id,
            enroll_id=d.enroll_id,
            arbitr_id=d.arbitr_id,
            reason=d.reason,
            disput_status=d.disput_status,
            winner_type=d.winner_type,
            created_at=d.created_at,
            taken_at=d.taken_at,
            completed_at=d.completed_at
        )
        for d in disputes_list
    ]


@dispute_app.post('/',
                  status_code=status.HTTP_201_CREATED,
                  summary='create dispute',
                  description='endpoint for creating a new dispute',
                  response_model=DisputeResponse)
async def create_dispute(
    dispute_data: CreateDisputeModel,
    dispute_usecase: DisputeUseCase = Depends(get_dispute_usecase),
    user=Depends(JWTManager.auth_required)
):
    new_dispute = await dispute_usecase.create_dispute(
        dispute_data=dispute_data,
        client_id=int(user.get('id'))
    )

    if isinstance(new_dispute, dict) and new_dispute.get('status') == 'failed creating dispute':
        await Exceptions400.creating_error(new_dispute.get('detail', 'Error creating dispute'))

    return DisputeResponse(
        id=new_dispute.id,
        client_id=new_dispute.client_id,
        master_id=new_dispute.master_id,
        enroll_id=new_dispute.enroll_id,
        arbitr_id=new_dispute.arbitr_id,
        reason=new_dispute.reason,
        disput_status=new_dispute.disput_status,
        winner_type=new_dispute.winner_type,
        created_at=new_dispute.created_at,
        taken_at=new_dispute.taken_at,
        completed_at=new_dispute.completed_at
    )


@dispute_app.get('/by-client',
                 summary='get disputes by client',
                 description='endpoint for getting disputes where user is client',
                 response_model=List[DisputeResponse])
async def get_disputes_by_client(
    dispute_usecase: DisputeUseCase = Depends(get_dispute_usecase),
    user=Depends(JWTManager.auth_required)
):
    disputes = await dispute_usecase.get_disputes_by_client(int(user.get('id')))
    return disputes


@dispute_app.get('/by-master',
                 summary='get disputes by master',
                 description='endpoint for getting disputes where user is master',
                 response_model=List[DisputeResponse])
async def get_disputes_by_master(
    dispute_usecase: DisputeUseCase = Depends(get_dispute_usecase),
    user=Depends(JWTManager.auth_required)
):
    disputes = await dispute_usecase.get_disputes_by_master(int(user.get('id')))
    return disputes


@dispute_app.get('/by-arbitr',
                 summary='get disputes by arbitr',
                 description='endpoint for getting disputes where user is arbitrator',
                 response_model=List[DisputeResponse])
async def get_disputes_by_arbitr(
    dispute_usecase: DisputeUseCase = Depends(get_dispute_usecase),
    user=Depends(JWTManager.auth_required)
):
    disputes = await dispute_usecase.get_disputes_by_arbitr(int(user.get('id')))
    return disputes


@dispute_app.get('/{dispute_id}',
                 summary='get detail dispute',
                 description='endpoint for getting detailed dispute information',
                 response_model=DetailDisputRespone)
async def get_detail_dispute(
    dispute_id: int,
    dispute_usecase: DisputeUseCase = Depends(get_dispute_usecase),
    dispute_repository: DisputeRepository = Depends(get_dispute_repository),
    user=Depends(JWTManager.auth_required)
):
    dispute = await dispute_repository.get_detail_dispute(dispute_id)

    if not dispute:
        await NotFoundException404.not_found('Dispute not found')

    user_id = int(user.get('id'))
    if (dispute.client_id != user_id and
        dispute.master_id != user_id and
            (dispute.arbitr_id is None or dispute.arbitr_id != user_id)):
        await Exceptions400.creating_error('Access denied: You can only view your own disputes')

    detail_dispute = await dispute_usecase.get_detail_dispute(dispute_id)

    if not detail_dispute:
        await NotFoundException404.not_found('Dispute not found')

    return detail_dispute


@dispute_app.delete('/{dispute_id}',
                    status_code=status.HTTP_200_OK,
                    summary='delete dispute',
                    description='endpoint for deleting a dispute')
async def delete_dispute(
    dispute_id: int,
    dispute_usecase: DisputeUseCase = Depends(get_dispute_usecase),
    user=Depends(JWTManager.auth_required)
):
    result = await dispute_usecase.delete_dispute(
        dispute_id=dispute_id,
        user_id=int(user.get('id'))
    )

    if result.get('status') == 'error':
        await Exceptions400.creating_error(result.get('detail', 'Error deleting dispute'))

    return {
        'status': 'success',
        'message': result.get('message')
    }
