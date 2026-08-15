"""Postgres access for the compute service.

Connections go through Supabase's transaction pooler, so the pool here is small
and every unit of work is an explicit transaction.  Prepared statements are
disabled because the transaction pooler does not support them across checkouts.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from contextlib import contextmanager

import psycopg
from psycopg_pool import ConnectionPool

_pool: ConnectionPool | None = None


class DatabaseNotConfiguredError(RuntimeError):
    """Raised when ``DATABASE_URL`` is absent."""


def database_url() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise DatabaseNotConfiguredError("DATABASE_URL is not set")
    return url


def get_pool() -> ConnectionPool:
    """Return the process-wide connection pool, opening it on first use."""
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=database_url(),
            min_size=int(os.environ.get("DB_POOL_MIN", "1")),
            max_size=int(os.environ.get("DB_POOL_MAX", "8")),
            kwargs={"prepare_threshold": None, "autocommit": False},
            open=True,
        )
    return _pool


def close_pool() -> None:
    """Close the pool (application shutdown, and between tests)."""
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def transaction() -> Iterator[psycopg.Connection]:
    """Yield a connection inside a transaction, committing on clean exit.

    Any exception rolls the whole unit of work back, which is what makes an
    XER import all-or-nothing.
    """
    with get_pool().connection() as conn, conn.transaction():
        yield conn


def healthy() -> bool:
    """Cheap liveness probe used by ``GET /healthz``."""
    try:
        with get_pool().connection() as conn:
            conn.execute("select 1")
        return True
    except Exception:
        return False
