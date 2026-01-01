from os import getenv
import redis
from redis.asyncio import Redis
from aiogram import Router, F, Bot
from aiogram.filters import CommandStart
from aiogram.types import Message
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from dotenv import load_dotenv

load_dotenv()

from .. import User, db_config, UserRepository, user_repo_obj, email_verfification_obj, EmailVerfifcation


NOTIFICATION_BOT_TOKEN: str = getenv('NOTIFICATION_BOT_TOKEN')
CREATOR_USER_TG_ID: str = getenv('CREATOR_USER_TG_ID')
REDIS_URL: str = getenv('REDIS_BACKEND') 

redis_client = Redis(
    host=REDIS_URL.split('://')[1].split(':')[0], 
    port=int(REDIS_URL.split(':')[2].split('/')[0])
)

master_router = Router()


class UserState(StatesGroup):
    email = State()
    enter_code = State()


@master_router.message(CommandStart())
async def give_main_root(
    message: Message,
    state: FSMContext) -> None:

    user_repository = UserRepository(db_config.Session())
    user = await user_repository.get_by_tg_id(int(message.from_user.id))
    if not user:
        await message.answer('Добро пожаловать в бота MSTV2! Поскольку вы у нас впервые давайте зарегистрируемся! Введите почту котороя принадлежит вам на нашем сайте')
        await state.set_state(UserState.email)


@master_router.message(UserState.email)
async def enter_email(
    message: Message,
    state: FSMContext
) -> None:

    user_repository = UserRepository(db_config.Session())
    email = message.text
    user = await user_repository.get_by_email(email)
    if not user:
        await message.answer('Пользователь с данной почтой не найден!')
        return


    await state.set_data({'email': email})
    code = await email_verfification_obj.create_enter_code()
    await redis_client.setex(f'verification_tg_code:{message.from_user.id}', 600, code)
    await email_verfification_obj.send_tg_verification_code(
        email,
        code
    )
    await message.answer('Вам на почту был отправлен код подтверждения. Введите его сюда без пробелов для привязки аккаунта')
    await state.set_state(UserState.enter_code)


@master_router.message(UserState.enter_code)
async def check_code(
    message: Message,
    state: FSMContext
) -> None:

    output_code = message.text
    storage_code_bytes = await redis_client.get(f'verification_tg_code:{message.from_user.id}')
    if not storage_code_bytes:
        await message.answer('Код истек или не найден. Попробуйте заново.')
        await state.clear()
        return

    if storage_code_bytes.decode('utf-8').strip() != output_code:
        await message.answer('Неверный код, попробуйте снова')
        return

    user_repository = UserRepository(db_config.Session())
    data = await state.get_data()
    user = await user_repository.get_by_email(data.get('email'))
    if not user:
        await message.answer('Пользователь не найден!')
        await state.clear()
        return

    async with db_config.Session.begin() as session:
        await session.merge(User(id=user.id, telegram_id=message.from_user.id))
        await session.flush()

    await message.answer('Телеграмм аккаунт успешно привязан!')
    await state.clear()
    # Keyboards coming soon 
