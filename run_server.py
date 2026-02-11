import uvicorn
from asyncio import run
from os import getenv

from dotenv import load_dotenv
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from server import (
    db_config,
    dispute_chat_websocket,
    lifespan,
    master_app,
    notifications_websocket,
    RateLimitMiddleware,
    service_chat_websocket,
    support_chat_websocket,
)

load_dotenv()

ENVIRONMENT = getenv('ENVIRONMENT', 'development')

app = FastAPI(
    title="MSTV2 API",
    description="API for MSTV2 service booking platform",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(RateLimitMiddleware)

# CORS configuration
ALLOWED_ORIGINS = getenv('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
if ENVIRONMENT == 'production':
    ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# global exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body}
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    from server.common.utils.logger import logger
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error" if ENVIRONMENT ==
                'production' else str(exc)}
    )

app.include_router(master_app)

app.websocket("/ws/service-chats/{chat_id}")(service_chat_websocket)
app.websocket("/ws/support-chats/{chat_id}")(support_chat_websocket)
app.websocket("/ws/dispute-chats/{chat_id}")(dispute_chat_websocket)
app.websocket("/ws/notifications")(notifications_websocket)


@app.get('/')
async def root():
    return {'status': 'welcome', 'api': 'MSTV2 API', 'version': '1.0.0'}


@app.get('/health')
async def health_check():
    '''Health check endpoint for monitoring'''
    try:
        async with db_config.Session() as session:
            await session.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
            "environment": ENVIRONMENT
        }
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e) if ENVIRONMENT != 'production' else "Database connection failed"
            }
        )


async def start_db():
    await db_config.up()


if __name__ == '__main__':
    run(start_db())
    uvicorn.run('run_server:app', reload=True)

#demo hold mvp confirm