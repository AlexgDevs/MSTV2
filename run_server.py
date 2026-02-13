import uvicorn
from asyncio import run
from os import getenv, path

from dotenv import load_dotenv
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
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

# CORS configuration - allow all origins for production deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


# Serve React static files - must be after all routes
frontend_path = "/app/client/dist"

if path.exists(frontend_path):
    # Монтируем папку assets отдельно (для JS/CSS)
    app.mount("/assets", StaticFiles(directory=f"{frontend_path}/assets"), name="static")

    # Для всех остальных путей отдаем index.html (поддержка React Router)
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Если запрос идет к API, FastAPI сам обработает его выше.
        # Если мы дошли сюда, значит это путь для фронта.
        return FileResponse(path.join(frontend_path, "index.html"))
else:
    print(f"Warning: Frontend directory {frontend_path} not found!")

if __name__ == '__main__':
    uvicorn.run('run_server:app', reload=True)


#demo hold mvp confirm
#working v2
