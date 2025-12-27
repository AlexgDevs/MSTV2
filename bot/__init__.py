from os import getenv
from aiogram import Bot, Dispatcher
from dotenv import load_dotenv

from .routers import master_router

load_dotenv()

NOTIFICATION_BOT_TOKEN = getenv('NOTIFICATION_BOT_TOKEN')

bot = Bot(NOTIFICATION_BOT_TOKEN)
dp = Dispatcher()
dp.include_router(master_router)


async def main():
    await dp.start_polling(bot)
