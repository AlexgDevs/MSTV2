from fastapi import APIRouter, Depends, status

from ..schemas import (
    TakeDisputeModel,
    ResolveDisputeModel
)

from ..usecases import (
    ArbitrageUseCase,
    get_arbitrage_usecase
)

from ...common.utils import (
    JWTManager,
    Exceptions400,
    NotFoundException404
)

arbitrage_app = APIRouter(prefix='/arbitrage', tags=['Arbitrage'])


@arbitrage_app.post(
    '/take',
    status_code=status.HTTP_200_OK,
    summary='Take dispute',
    description='Take a dispute for arbitration (change status and add arbitr_id)'
)
async def take_dispute(
    dispute_data: TakeDisputeModel,
    arbitrage_usecase: ArbitrageUseCase = Depends(get_arbitrage_usecase),
    user=Depends(JWTManager.auth_required)
):
    result = await arbitrage_usecase.take_dispute(
        dispute_id=dispute_data.dispute_id,
        arbitr_id=int(user.get('id'))
    )

    if result.get('status') == 'error':
        await Exceptions400.creating_error(result.get('detail', 'Error taking dispute'))

    return {
        'status': 'success',
        'dispute_id': result.get('dispute_id'),
        'message': result.get('message')
    }


@arbitrage_app.post(
    '/resolve',
    status_code=status.HTTP_200_OK,
    summary='Resolve dispute',
    description='Resolve a dispute with winner type and redirect to orchestrator'
)
async def resolve_dispute(
    dispute_data: ResolveDisputeModel,
    arbitrage_usecase: ArbitrageUseCase = Depends(get_arbitrage_usecase),
    user=Depends(JWTManager.auth_required)
):
    result = await arbitrage_usecase.resolve_dispute(
        dispute_id=dispute_data.dispute_id,
        winner_type=dispute_data.winner_type,
        arbitr_id=int(user.get('id'))
    )

    if result.get('status') == 'error':
        await Exceptions400.creating_error(result.get('detail', 'Error resolving dispute'))

    return {
        'status': 'success',
        'dispute_id': result.get('dispute_id'),
        'winner_type': result.get('winner_type'),
        'message': result.get('message'),
        'orchestrator_started': result.get('orchestrator_started', False)
    }
