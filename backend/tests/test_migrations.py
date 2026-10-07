from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import text

from app.core.db import Base
from tests.conftest import _state


def test_migrations_match_the_models(engine):
    """Every table, column and index in the models exists after `alembic upgrade head`.

    Catches a model change committed without its migration (the cause of the production
    login 500: the login_attempts table was in the models but never migrated).
    """
    with engine.begin() as conn:
        # Only the test schema: with `public` on the path, reflection would also see the
        # real tables and hide anything the migrations left out. LOCAL ends with the transaction.
        conn.execute(text(f'SET LOCAL search_path TO "{_state["schema"]}"'))
        diffs = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    assert diffs == [], f"Models and migrations differ; run `alembic revision --autogenerate`: {diffs}"
