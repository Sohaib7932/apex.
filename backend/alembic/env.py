from logging.config import fileConfig

from sqlalchemy import create_engine, pool

from alembic import context
from app import models  # noqa: F401  (registers models on Base.metadata)
from app.core.config import get_settings
from app.core.db import Base

config = context.config
# Tests pass their own connection (pointed at a throwaway schema) and keep their own logging.
external = config.attributes.get("connection")
if config.config_file_name is not None and external is None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=get_settings().sqlalchemy_url_unpooled,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    if external is not None:
        # version_table_schema pins alembic_version to the test schema, so the real one in
        # `public` (visible through search_path) is never read or written.
        context.configure(
            connection=external,
            target_metadata=target_metadata,
            version_table_schema=config.attributes["version_table_schema"],
        )
        with context.begin_transaction():
            context.run_migrations()
        return
    # Direct (unpooled) connection: DDL should not go through PgBouncer.
    engine = create_engine(get_settings().sqlalchemy_url_unpooled, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
