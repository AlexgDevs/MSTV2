from datetime import datetime
from typing import Any, List, Literal

from pydantic import BaseModel


class CreateServiceModel(BaseModel):
    title: str
    description: str
    price: int
    photo: str


class PatchServiceModel(BaseModel):
    title: str | None = None 
    description: str | None = None 
    price: int | None = None
    photo: str | None = None


class ServiceResponse(BaseModel):
    id: int
    title: str
    description: str
    user_id: int
    price: int
    photo: str