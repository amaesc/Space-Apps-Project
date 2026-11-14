from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


def _load_local_env() -> str | None:
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")
    env_file = Path(__file__).resolve().parents[1] / ".env"
    if not env_file.exists():
        return None
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        if k.strip() == "DATABASE_URL":
            return v.strip().strip('"').strip("'")
    return None


DATABASE_URL = _load_local_env()


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
