import json
import sqlite3
from datetime import UTC, datetime
from threading import Lock
from typing import Any

from fastapi import HTTPException

from core.config import DB_PATH

_DB_LOCK = Lock()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def validate_quiz_payload(quiz: dict) -> None:
    questions = quiz.get("questions")
    if not isinstance(questions, list) or len(questions) == 0:
        raise HTTPException(status_code=400, detail="Quiz must include a non-empty questions array.")

    for item in questions:
        if not isinstance(item, dict):
            raise HTTPException(status_code=400, detail="Each question must be an object.")
        text = item.get("question")
        choices = item.get("choices")
        correct_index = item.get("correct_index")
        if not isinstance(text, str) or not text.strip():
            raise HTTPException(status_code=400, detail="Question text is invalid.")
        if not isinstance(choices, list) or len(choices) != 4 or not all(isinstance(c, str) and c.strip() for c in choices):
            raise HTTPException(status_code=400, detail="Each question must have 4 non-empty choices.")
        if not isinstance(correct_index, int) or correct_index < 0 or correct_index > 3:
            raise HTTPException(status_code=400, detail="Each question must include a valid correct_index.")


def create_game(user_id: int, title: str, category: str, quiz: dict) -> dict[str, Any]:
    validate_quiz_payload(quiz)
    now = datetime.now(UTC).isoformat()
    questions_count = len(quiz["questions"])

    with _DB_LOCK:
        conn = _connect()
        try:
            cursor = conn.execute(
                """
                INSERT INTO games (user_id, title, category, quiz_json, questions_count, plays, pinned, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)
                """,
                (user_id, title.strip(), category.strip(), json.dumps(quiz), questions_count, now, now),
            )
            conn.commit()
            game_id = cursor.lastrowid
            row = conn.execute(
                """
                SELECT id, title, category, plays, pinned, updated_at, questions_count, quiz_json
                FROM games
                WHERE id = ? AND user_id = ?
                """,
                (game_id, user_id),
            ).fetchone()
            if row is None:
                raise RuntimeError("Failed to read saved game.")
            return _row_to_game(row)
        finally:
            conn.close()


def list_games(user_id: int) -> list[dict[str, Any]]:
    with _DB_LOCK:
        conn = _connect()
        try:
            rows = conn.execute(
                """
                SELECT id, title, category, plays, pinned, updated_at, questions_count, quiz_json
                FROM games
                WHERE user_id = ?
                ORDER BY pinned DESC, updated_at DESC
                """,
                (user_id,),
            ).fetchall()
            return [_row_to_game(row) for row in rows]
        finally:
            conn.close()


def set_game_pinned(user_id: int, game_id: int, pinned: bool) -> dict[str, Any]:
    with _DB_LOCK:
        conn = _connect()
        try:
            existing = conn.execute(
                "SELECT id, pinned FROM games WHERE id = ? AND user_id = ?",
                (game_id, user_id),
            ).fetchone()
            if existing is None:
                raise HTTPException(status_code=404, detail="Game not found.")

            if pinned:
                pinned_count_row = conn.execute(
                    "SELECT COUNT(*) AS count FROM games WHERE user_id = ? AND pinned = 1",
                    (user_id,),
                ).fetchone()
                pinned_count = int(pinned_count_row["count"] if pinned_count_row else 0)
                if pinned_count >= 5 and existing["pinned"] == 0:
                    raise HTTPException(status_code=400, detail="You can pin up to 5 games.")

            now = datetime.now(UTC).isoformat()
            conn.execute(
                "UPDATE games SET pinned = ?, updated_at = ? WHERE id = ? AND user_id = ?",
                (1 if pinned else 0, now, game_id, user_id),
            )
            conn.commit()

            row = conn.execute(
                """
                SELECT id, title, category, plays, pinned, updated_at, questions_count, quiz_json
                FROM games
                WHERE id = ? AND user_id = ?
                """,
                (game_id, user_id),
            ).fetchone()
            if row is None:
                raise RuntimeError("Failed to load updated game.")
            return _row_to_game(row)
        finally:
            conn.close()


def _row_to_game(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": int(row["id"]),
        "title": row["title"],
        "category": row["category"],
        "plays": int(row["plays"]),
        "pinned": bool(row["pinned"]),
        "updated_at": row["updated_at"],
        "questions_count": int(row["questions_count"]),
        "quiz": json.loads(row["quiz_json"]),
    }
