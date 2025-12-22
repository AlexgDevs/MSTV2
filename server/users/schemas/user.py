from datetime import datetime
from typing import Any, List, Literal

from pydantic import BaseModel, model_validator


class SimpleUserScheduleTemplate(BaseModel):
    id: int
    day: str
    hours_work: dict[str, Any]
    is_active: bool
    service_id: int | None = None

    class Config:
        from_attributes = True


class SimpleUserService(BaseModel):
    id: int
    title: str
    description: str
    price: int
    photo: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class SimpleServiceAuthor(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class SimpleServiceInfo(BaseModel):
    id: int
    title: str
    description: str
    user: SimpleServiceAuthor | None = None

    @model_validator(mode='before')
    @classmethod
    def extract_user(cls, data: Any):
        if isinstance(data, dict):
            return data
        if hasattr(data, 'user') and data.user:
            return {
                'id': data.id,
                'title': data.title,
                'description': data.description,
                'user': {
                    'id': data.user.id,
                    'name': data.user.name
                }
            }
        return data

    class Config:
        from_attributes = True


class SimpleServiceEnroll(BaseModel):
    id: int
    slot_time: str
    status: Literal['pending', 'confirmed',
                    'completed', 'cancelled', 'expired']
    price: int
    service_id: int
    service_date_id: int
    date: str | None = None
    service: SimpleServiceInfo | None = None

    @model_validator(mode='before')
    @classmethod
    def extract_date(cls, data: Any):
        if isinstance(data, dict):
            if 'service_date' in data and data['service_date']:
                data['date'] = data['service_date'].date if hasattr(
                    data['service_date'], 'date') else None
            return data
        if hasattr(data, 'service_date') and data.service_date:
            result = {}
            for key in ['id', 'slot_time', 'status', 'price', 'service_id', 'service_date_id']:
                if hasattr(data, key):
                    result[key] = getattr(data, key)
            result['date'] = data.service_date.date
            if hasattr(data, 'service') and data.service:
                result['service'] = data.service
            return result
        return data

    class Config:
        from_attributes = True


class SimpleUserTag(BaseModel):
    id: int
    title: str
    service_id: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class CreateUserModel(BaseModel):
    name: str
    password: str
    email: str
    about: str | None = None
    recaptcha_token: str | None = None  # Токен Cloudflare Turnstile


class PatchUserModel(BaseModel):
    name: str | None = None
    password: str | None = None
    email: str | None = None
    about: str | None = None


class LoginUserModel(BaseModel):
    name: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    about: str | None
    role: Literal['user', 'admin', 'moderator']

    class Config:
        from_attributes = True


class DetailUserResponse(BaseModel):
    id: int
    name: str
    email: str
    about: str | None = None
    role: Literal['user', 'admin', 'moderator']
    verified_email: bool
    templates: List[SimpleUserScheduleTemplate]
    services: List[SimpleUserService]
    services_enroll: List[SimpleServiceEnroll]
    tags: List[SimpleUserTag]

    class Config:
        from_attributes = True
