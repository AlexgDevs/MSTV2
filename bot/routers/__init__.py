from os import getenv
from aiogram import Router, F, Bot
from aiogram.filters import CommandStart
from aiogram.types import Message
from dotenv import load_dotenv

load_dotenv()

NOTIFICATION_BOT_TOKEN: str = getenv('NOTIFICATION_BOT_TOKEN')
CREATOR_USER_TG_ID: str = getenv('CREATOR_USER_TG_ID')

master_router = Router()

@master_router.message(CommandStart())
async def give_main_root(
    message: Message,
    bot: Bot) -> None:

    if bot.token != NOTIFICATION_BOT_TOKEN or message.from_user.id != int(CREATOR_USER_TG_ID):
        await message.answer('Вы используйте не оффициального бота или не являйтесь админом!')
        return 

    await message.answer(f'Добро пожаловать!, ваш айди - {message.from_user.id}')
    # add keyboards with help builder
