import sqlite3
from datetime import UTC, datetime
from threading import Lock
from typing import Any

from core.config import DB_PATH

_DB_LOCK = Lock()


def init_user_db() -> None:
    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    reset_token_hash TEXT,
                    reset_token_expires_at TEXT
                )
                """
            )
            conn.commit()
        finally:
            conn.close()


def create_user(email: str, password_hash: str) -> dict[str, Any]:
    now = datetime.now(UTC).isoformat()
    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.execute(
                "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
                (email.lower(), password_hash, now),
            )
            conn.commit()
            user_id = cursor.lastrowid
            row = conn.execute("SELECT id, email FROM users WHERE id = ?", (user_id,)).fetchone()
            if row is None:
                raise RuntimeError("User insert failed.")
            return dict(row)
        finally:
            conn.close()


def get_user_by_email(email: str) -> dict[str, Any] | None:
    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            row = conn.execute(
                "SELECT id, email, password_hash, reset_token_hash, reset_token_expires_at FROM users WHERE email = ?",
                (email.lower(),),
            ).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()


def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            row = conn.execute("SELECT id, email FROM users WHERE id = ?", (user_id,)).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()


def save_password_reset_token(email: str, token_hash: str, expires_at: datetime) -> None:
    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute(
                """
                UPDATE users
                SET reset_token_hash = ?, reset_token_expires_at = ?
                WHERE email = ?
                """,
                (token_hash, expires_at.isoformat(), email.lower()),
            )
            conn.commit()
        finally:
            conn.close()


def get_user_by_reset_token_hash(token_hash: str) -> dict[str, Any] | None:
    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            row = conn.execute(
                """
                SELECT id, email, reset_token_hash, reset_token_expires_at
                FROM users
                WHERE reset_token_hash = ?
                """,
                (token_hash,),
            ).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()


def update_user_password(user_id: int, password_hash: str) -> None:
    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute(
                """
                UPDATE users
                SET password_hash = ?, reset_token_hash = NULL, reset_token_expires_at = NULL
                WHERE id = ?
                """,
                (password_hash, user_id),
            )
            conn.commit()
        finally:
            conn.close()
