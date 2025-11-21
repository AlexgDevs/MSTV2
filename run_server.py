import uvicorn
from asyncio import run
from fastapi import FastAPI
from server import (
    master_app, 
    db_config
)

app = FastAPI(description='mstv2 api')
app.include_router(master_app)

async def start_db():
    await db_config.up()

if __name__ == '__main__':
    run(start_db())
    uvicorn.run('run_server:app', reload=True)