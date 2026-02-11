from pydantic import BaseModel


class CreateTagModel(BaseModel):
    title: str
    service_id: int


class PatchTagModel(BaseModel):
    title: str | None = None
    service_id: int | None = None


class TagResponse(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True


class TagCreateResponse(BaseModel):
    status: str

#demo hold mvp confirm