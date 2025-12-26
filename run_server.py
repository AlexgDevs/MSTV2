from server.websockets.support_chat import support_chat_websocket
from server.websockets.service_chat import service_chat_websocket
from server.websockets.notfifcations import notifications_websocket
import uvicorn
from asyncio import run
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from server import (
    master_app,
    db_config,
    RateLimitMiddleware
)
from server.common.utils.rate_limiter_config import lifespan
from os import getenv
from dotenv import load_dotenv

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
    # In production, add your actual domain
    ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handlers
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
app.websocket("/ws/notifications")(notifications_websocket)


@app.get('/')
async def root():
    return {'status': 'welcome', 'api': 'MSTV2 API', 'version': '1.0.0'}


@app.get('/health')
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check database connection
        from sqlalchemy import text
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