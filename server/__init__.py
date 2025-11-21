from fastapi import APIRouter
from .common import db_config

master_app = APIRouter(prefix='/api/v1', tags=['MASTER'])