import uvicorn
from asyncio import run
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server import (
    master_app, 
    db_config
)

app = FastAPI(description='mstv2 api')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],  # Разрешить все методы включая OPTIONS
    allow_headers=["*"],
)

app.include_router(master_app)



@app.get('/')
async def say_title():
    return {'status': 'welocome'}


async def start_db():
    await db_config.up()

if __name__ == '__main__':
    run(start_db())
    uvicorn.run('run_server:app', reload=True)