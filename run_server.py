from server.websockets.support_chat import support_chat_websocket
from server.websockets.service_chat import service_chat_websocket
import uvicorn
from asyncio import run
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server import (
    master_app,
    db_config,
    RateLimitMiddleware
)
from server.common.utils.rate_limiter_config import lifespan

app = FastAPI(description='mstv2 api', lifespan=lifespan)
app.add_middleware(RateLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(master_app)

app.websocket("/ws/service-chats/{chat_id}")(service_chat_websocket)
app.websocket("/ws/support-chats/{chat_id}")(support_chat_websocket)


@app.get('/')
async def say_title():
    return {'status': 'welocome'}


async def start_db():
    await db_config.up()


if __name__ == '__main__':
    run(start_db())
    uvicorn.run('run_server:app', reload=True)
