from os import getenv

from dotenv import load_dotenv

from sqlalchemy import (
    select,
    join
)

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession)

from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    joinedload,
    selectinload
)

load_dotenv()


class Base(DeclarativeBase):
    id: Mapped[int] = mapped_column(primary_key=True)


# Базовый класс для промежуточных таблиц M2M без id
# Используем тот же registry что и Base, чтобы классы видели друг друга
class AssociationBase(DeclarativeBase):
    registry = Base.registry
    metadata = Base.metadata


class DataBaseConfiguration:
    def __init__(
        self,
        db_url,
        echo: bool = False
    ):

        self.db_url = db_url
        self.echo = echo
        
        # Настройки пула соединений для предотвращения исчерпания
        # Для SQLite используем другие настройки
        is_sqlite = "sqlite" in db_url.lower()
        
        engine_kwargs = {
            "url": self.db_url,
            "echo": self.echo,
        }
        
        if not is_sqlite:
            # Для PostgreSQL/MySQL настраиваем пул соединений
            engine_kwargs.update({
                "pool_size": 20,  # Количество соединений в пуле
                "max_overflow": 10,  # Дополнительные соединения сверх pool_size
                "pool_timeout": 30,  # Таймаут ожидания свободного соединения (секунды)
                "pool_recycle": 3600,  # Пересоздавать соединения через час (предотвращает таймауты БД)
                "pool_pre_ping": True,  # Проверять соединения перед использованием
            })
        else:
            # Для SQLite используем специальные настройки
            engine_kwargs["connect_args"] = {"check_same_thread": False}
        
        self.engine = create_async_engine(**engine_kwargs)

        self.Session = async_sessionmaker(
            self.engine,
            expire_on_commit=False,
            class_=AsyncSession
        )

    async def up(self):
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def drop(self):
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)

    async def migrate(self):
        await self.drop()
        await self.up()

    async def session(self):
        async with self.Session() as session:
            yield session

    async def session_begin(self):
        async with self.Session.begin() as session:
            yield session


db_config = DataBaseConfiguration(
    getenv('DB_URL'),
    True
)

from .models import (
    ServiceTagConnection,
    User,
    ScheduleTemplate,
    Service,
    ServiceDate,
    ServiceEnroll,
    Tag,
    Payment,
    SupportChat,
    ServiceChat,
    ServiceMessage,
    SupportMessage,
    Account
)