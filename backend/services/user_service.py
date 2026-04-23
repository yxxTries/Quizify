import sqlite3
import re
from datetime import UTC, datetime
from threading import Lock
from typing import Any

from core.config import DB_PATH

_DB_LOCK = Lock()
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_]{3,24}$")


def _generate_unique_username(email: str, existing_usernames: set[str]) -> str:
    local_part = email.split("@", 1)[0]
    normalized = re.sub(r"[^A-Za-z0-9_]", "", local_part)
    base = (normalized or "quizuser")[:24]
    if len(base) < 3:
        base = f"{base}user"[:24]

    candidate = base
    suffix = 1
    while candidate.lower() in existing_usernames:
        suffix_text = str(suffix)
        trimmed = base[: max(3, 24 - len(suffix_text))]
        candidate = f"{trimmed}{suffix_text}"
        suffix += 1
    return candidate


def _ensure_username_column(conn: sqlite3.Connection) -> None:
    conn.row_factory = sqlite3.Row
    columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(users)").fetchall()
    }

    if "username" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN username TEXT")

    existing_rows = conn.execute(
        "SELECT username FROM users WHERE username IS NOT NULL AND TRIM(username) <> ''"
    ).fetchall()
    existing_usernames = {str(row["username"]).lower() for row in existing_rows}

    rows_missing_username = conn.execute(
        "SELECT id, email FROM users WHERE username IS NULL OR TRIM(username) = ''"
    ).fetchall()
    for row in rows_missing_username:
        username = _generate_unique_username(str(row["email"]), existing_usernames)
        conn.execute("UPDATE users SET username = ? WHERE id = ?", (username, row["id"]))
        existing_usernames.add(username.lower())

    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username COLLATE NOCASE)"
    )


def init_user_db() -> None:
    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    username TEXT,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    reset_token_hash TEXT,
                    reset_token_expires_at TEXT
                )
                """
            )
            _ensure_username_column(conn)
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS games (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    category TEXT NOT NULL,
                    quiz_json TEXT NOT NULL,
                    questions_count INTEGER NOT NULL,
                    plays INTEGER NOT NULL DEFAULT 0,
                    pinned INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id)")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS discover_posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    category TEXT NOT NULL,
                    quiz_json TEXT NOT NULL,
                    questions_count INTEGER NOT NULL,
                    plays INTEGER NOT NULL DEFAULT 0,
                    rating REAL NOT NULL DEFAULT 0,
                    difficulty TEXT NOT NULL DEFAULT 'Medium',
                    estimated_time TEXT NOT NULL DEFAULT '5 min',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_discover_posts_created_at ON discover_posts(created_at DESC)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_discover_posts_category ON discover_posts(category)")
            conn.commit()
        finally:
            conn.close()


def create_user(email: str, password_hash: str) -> dict[str, Any]:
    now = datetime.now(UTC).isoformat()
    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            existing_rows = conn.execute(
                "SELECT username FROM users WHERE username IS NOT NULL AND TRIM(username) <> ''"
            ).fetchall()
            existing_usernames = {str(row["username"]).lower() for row in existing_rows}
            username = _generate_unique_username(email, existing_usernames)
            cursor = conn.execute(
                "INSERT INTO users (email, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (email.lower(), username, password_hash, now),
            )
            conn.commit()
            user_id = cursor.lastrowid
            row = conn.execute("SELECT id, email, username FROM users WHERE id = ?", (user_id,)).fetchone()
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
                """
                SELECT id, email, username, password_hash, reset_token_hash, reset_token_expires_at
                FROM users
                WHERE email = ?
                """,
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
            row = conn.execute("SELECT id, email, username FROM users WHERE id = ?", (user_id,)).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()


def get_user_auth_by_id(user_id: int) -> dict[str, Any] | None:
    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            row = conn.execute(
                """
                SELECT id, email, username, password_hash, reset_token_hash, reset_token_expires_at
                FROM users
                WHERE id = ?
                """,
                (user_id,),
            ).fetchone()
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
                SELECT id, email, username, reset_token_hash, reset_token_expires_at
                FROM users
                WHERE reset_token_hash = ?
                """,
                (token_hash,),
            ).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()


def update_user_profile(user_id: int, email: str, username: str) -> dict[str, Any]:
    normalized_email = email.lower().strip()
    normalized_username = username.strip()
    if not USERNAME_PATTERN.fullmatch(normalized_username):
        raise ValueError("Username must be 3-24 characters and use only letters, numbers, or underscores.")

    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            email_conflict = conn.execute(
                "SELECT id FROM users WHERE email = ? AND id != ?",
                (normalized_email, user_id),
            ).fetchone()
            if email_conflict is not None:
                raise ValueError("An account with this email already exists.")

            username_conflict = conn.execute(
                "SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?",
                (normalized_username, user_id),
            ).fetchone()
            if username_conflict is not None:
                raise ValueError("That username is already taken.")

            conn.execute(
                """
                UPDATE users
                SET email = ?, username = ?
                WHERE id = ?
                """,
                (normalized_email, normalized_username, user_id),
            )
            conn.commit()

            row = conn.execute("SELECT id, email, username FROM users WHERE id = ?", (user_id,)).fetchone()
            if row is None:
                raise RuntimeError("Failed to load updated user.")
            return dict(row)
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
