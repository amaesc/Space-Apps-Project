from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

DATABASE_URL = os.getenv("DATABASE_URL")


def is_db_configured() -> bool:
    return bool(DATABASE_URL)


@contextmanager
def get_conn() -> Iterator["psycopg.Connection"]:
    import psycopg
    from psycopg.rows import dict_row

    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        yield conn
