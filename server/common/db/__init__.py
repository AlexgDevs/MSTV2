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


class DataBaseConfiguration:
    def __init__(
        self,
        db_url,
        echo: bool = False
    ):

        self.db_url = db_url
        self.echo = echo
        self.engine = create_async_engine(
            url=self.db_url,
            echo=self.echo
        )

        self.Session = async_sessionmaker(
            self.engine,
            expire_on_commit=False
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
    User,
    ScheduleTemplate,
    Service,
    ServiceDate,
    ServiceEnroll
)