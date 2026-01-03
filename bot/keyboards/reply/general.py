from aiogram.utils.keyboard import ReplyKeyboardBuilder
from aiogram.types import KeyboardButton

from ... import db_config, UserRepository

def main_menu_keyboard():
    builder = ReplyKeyboardBuilder()
    builder.add(KeyboardButton(text='Мой статус'))
    builder.add(KeyboardButton(text='Уведомления'))
    builder.add(KeyboardButton(text='Поддержка'))
    builder.add(KeyboardButton(text='Настройки'))
    builder.add(KeyboardButton(text='Документация'))
    builder.add(KeyboardButton(text='Реферал'))

    return builder.adjust(2).as_markup(keyboard_resize=True)

async def notifications_menu_keyboard(user_tg_id: int):
    user_repo = UserRepository(db_config.Session())
    user = await user_repo.get_by_tg_id(user_tg_id)
    if not user:
        return None

    builder = ReplyKeyboardBuilder()

    match user.role:
        case 'admin':
            builder.add(KeyboardButton(text='Массововое уведомление'))
            builder.add(KeyboardButton(text='Уведомление группы пользователей'))
            builder.add(KeyboardButton(text='Уведомление пользователя'))
            builder.add(KeyboardButton(text='История уведомлений'))
        case 'user':
            builder.add(KeyboardButton(text='Уведомление группы пользователей'))
            builder.add(KeyboardButton(text='Уведомление пользователя'))
            builder.add(KeyboardButton(text='История уведомлений'))
        case _:
            pass

    builder.add(KeyboardButton(text='Назад'))
    return builder.adjust(2).as_markup(resize_keyboard=True)