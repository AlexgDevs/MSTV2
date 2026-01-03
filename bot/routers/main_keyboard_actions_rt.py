from aiogram import Router
from aiogram import Router, F, Bot
from aiogram.filters import CommandStart
from aiogram.types import Message
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State

from ..keyboards import notifications_menu_keyboard

main_keyboard_actions_router = Router()


@main_keyboard_actions_router.message(F.text == 'Уведомления')
async def get_notfifications_keyboard(
    message: Message
) -> None:

    return message.answer('Вы вошли в раздел уведомлений', reply_markup=await notifications_menu_keyboard(message.from_user.id))