from pydantic import BaseModel

class VerifiedEmailCodeModel(BaseModel):
    code: str