from fastapi import APIRouter, status, Depends

from ..usecses import (
    get_tag_usecase,
    TagUseCase
)

from ..schemas import (
    CreateTagModel,
    TagCreateResponse
)

from ...common.utils import (
    JWTManager,
    Exceptions400
)

tag_app = APIRouter(prefix='/tags', tags=['Tags'])


@tag_app.post('/',
              status_code=status.HTTP_201_CREATED,
              response_model=TagCreateResponse,
              summary='create tag',
              description='endpoint for creating tag')
async def create_tag(
    tag_data: CreateTagModel,
    user=Depends(JWTManager.auth_required),
    tag_use_case: TagUseCase = Depends(get_tag_usecase)
):

    new_tag = await tag_use_case.create_tag(
        int(user.get('id')),
        tag_data
    )

    if isinstance(new_tag, dict):
        Exceptions400.creating_error(str(new_tag.get('detail', 'error')))

    return {'status': 'created'}
