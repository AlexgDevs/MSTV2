from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from server.common.db import Base, db_config

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def make_sync_url(async_url: str) -> str:
    if async_url.startswith("postgresql+asyncpg://"):
        return async_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if async_url.startswith("sqlite+aiosqlite://"):
        return async_url.replace("sqlite+aiosqlite://", "sqlite://", 1)
    return async_url


def run_migrations_offline() -> None:
    url = make_sync_url(db_config.db_url)
    config.set_main_option("sqlalchemy.url", url)
    
    # Используем batch mode для SQLite
    is_sqlite = url.startswith("sqlite://")
    
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=is_sqlite,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = make_sync_url(db_config.db_url)
    config.set_main_option("sqlalchemy.url", url)

    connectable = create_engine(
        url,
        poolclass=pool.NullPool,
    )

    # Используем batch mode для SQLite
    is_sqlite = url.startswith("sqlite://")

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=is_sqlite,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
