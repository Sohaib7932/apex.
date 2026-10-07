"""Describe a database error for the logs without leaking data or credentials."""

import re

from sqlalchemy.exc import DBAPIError, SQLAlchemyError

# Defensive scrub in case a message ever echoes a connection string or a key.
_SECRETS = re.compile(r"\w+://\S+|(sk|rk)_(test|live)_\w+|whsec_\w+|npg_\w+|password=\S+", re.I)
_MAX_STATEMENT = 600


def _clean(text: str | None, limit: int) -> str | None:
    if not text:
        return None
    return _SECRETS.sub("[redacted]", " ".join(text.split()))[:limit]


def describe_db_error(exc: SQLAlchemyError) -> dict[str, str | None]:
    """Class, SQLSTATE, the server's primary message and the SQL text.

    The statement is SQLAlchemy's compiled text with placeholders (`%(email_1)s`), so bound
    values never appear. The primary message holds names (tables, columns, constraints), not
    row values: those are in the DETAIL line, which is left out on purpose.
    """
    orig = exc.orig if isinstance(exc, DBAPIError) else None
    diag = getattr(orig, "diag", None)
    driver = f"{type(orig).__module__}.{type(orig).__name__}" if orig is not None else None
    return {
        "error_class": type(exc).__name__,
        "driver_error": driver,
        "sqlstate": getattr(orig, "sqlstate", None),
        "db_message": _clean(getattr(diag, "message_primary", None), 300),
        "statement": _clean(getattr(exc, "statement", None), _MAX_STATEMENT),
    }
