import json
import sqlite3
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException

from services.game_service import _DB_LOCK, _connect, validate_quiz_payload

POST_COOLDOWN_SECONDS = 60
MAX_DISCOVER_POSTS_PER_USER = 25
RECENT_DUPLICATE_WINDOW_HOURS = 12


def _normalize_text(value: Any, fallback: str, max_length: int) -> str:
    if not isinstance(value, str):
        return fallback
    cleaned = value.strip()
    if not cleaned:
        return fallback
    return cleaned[:max_length]


def _build_discover_meta(author: str, title: str, category: str, quiz: dict) -> dict[str, Any]:
    existing = quiz.get("discoverMeta") if isinstance(quiz.get("discoverMeta"), dict) else {}
    question_count = len(quiz["questions"])
    estimated_minutes = max(3, question_count)
    return {
        "title": title,
        "author": author,
        "category": category,
        "difficulty": _normalize_text(existing.get("difficulty"), "Medium", 32),
        "plays": 0,
        "estimatedTime": _normalize_text(existing.get("estimatedTime"), f"{estimated_minutes} min", 32),
        "questionCount": question_count,
        "rating": 0,
    }


def create_discover_post(user_id: int, author: str, title: str, category: str, quiz: dict) -> dict[str, Any]:
    validate_quiz_payload(quiz)
    clean_title = title.strip()
    clean_category = category.strip()
    if not clean_title:
        raise HTTPException(status_code=400, detail="Title is required.")
    if not clean_category:
        raise HTTPException(status_code=400, detail="Category is required.")
    now = datetime.now(UTC).isoformat()
    discover_meta = _build_discover_meta(author=author, title=clean_title, category=clean_category, quiz=quiz)
    stored_quiz = {
        **quiz,
        "discoverMeta": discover_meta,
    }
    questions_count = len(stored_quiz["questions"])

    with _DB_LOCK:
        conn = _connect()
        try:
            existing_count_row = conn.execute(
                "SELECT COUNT(*) AS count FROM discover_posts WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            existing_count = int(existing_count_row["count"] if existing_count_row else 0)
            if existing_count >= MAX_DISCOVER_POSTS_PER_USER:
                raise HTTPException(
                    status_code=400,
                    detail="You have reached the Discover posting limit. Delete an older post before publishing another.",
                )

            latest_post = conn.execute(
                """
                SELECT created_at
                FROM discover_posts
                WHERE user_id = ?
                ORDER BY created_at DESC, id DESC
                LIMIT 1
                """,
                (user_id,),
            ).fetchone()
            if latest_post is not None:
                latest_created_at = datetime.fromisoformat(str(latest_post["created_at"]))
                if latest_created_at > datetime.now(UTC) - timedelta(seconds=POST_COOLDOWN_SECONDS):
                    raise HTTPException(
                        status_code=429,
                        detail="Please wait about a minute before posting to Discover again.",
                    )

            duplicate_cutoff = (datetime.now(UTC) - timedelta(hours=RECENT_DUPLICATE_WINDOW_HOURS)).isoformat()
            serialized_quiz = json.dumps(stored_quiz)
            duplicate_post = conn.execute(
                """
                SELECT id
                FROM discover_posts
                WHERE user_id = ?
                  AND LOWER(title) = LOWER(?)
                  AND quiz_json = ?
                  AND created_at >= ?
                LIMIT 1
                """,
                (user_id, clean_title, serialized_quiz, duplicate_cutoff),
            ).fetchone()
            if duplicate_post is not None:
                raise HTTPException(
                    status_code=409,
                    detail="This quiz is already posted to Discover. Delete the existing post if you want to replace it.",
                )

            cursor = conn.execute(
                """
                INSERT INTO discover_posts (
                    user_id,
                    title,
                    category,
                    quiz_json,
                    questions_count,
                    plays,
                    rating,
                    difficulty,
                    estimated_time,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    clean_title,
                    clean_category,
                    serialized_quiz,
                    questions_count,
                    discover_meta["difficulty"],
                    discover_meta["estimatedTime"],
                    now,
                    now,
                ),
            )
            conn.commit()
            post_id = cursor.lastrowid
            row = conn.execute(
                """
                SELECT
                    dp.id,
                    dp.user_id,
                    dp.title,
                    dp.category,
                    u.username AS author,
                    dp.plays,
                    dp.rating,
                    dp.difficulty,
                    dp.estimated_time,
                    dp.created_at,
                    dp.updated_at,
                    dp.questions_count,
                    dp.quiz_json
                FROM discover_posts dp
                JOIN users u ON u.id = dp.user_id
                WHERE dp.id = ?
                """,
                (post_id,),
            ).fetchone()
            if row is None:
                raise RuntimeError("Failed to load discover post.")
            return _row_to_discover_post(row)
        finally:
            conn.close()


def list_discover_posts() -> list[dict[str, Any]]:
    with _DB_LOCK:
        conn = _connect()
        try:
            rows = conn.execute(
                """
                SELECT
                    dp.id,
                    dp.user_id,
                    dp.title,
                    dp.category,
                    u.username AS author,
                    dp.plays,
                    dp.rating,
                    dp.difficulty,
                    dp.estimated_time,
                    dp.created_at,
                    dp.updated_at,
                    dp.questions_count,
                    dp.quiz_json
                FROM discover_posts dp
                JOIN users u ON u.id = dp.user_id
                ORDER BY dp.created_at DESC, dp.id DESC
                """
            ).fetchall()
            return [_row_to_discover_post(row) for row in rows]
        finally:
            conn.close()


def delete_discover_post(user_id: int, post_id: int) -> None:
    with _DB_LOCK:
        conn = _connect()
        try:
            existing = conn.execute(
                "SELECT id, user_id FROM discover_posts WHERE id = ?",
                (post_id,),
            ).fetchone()
            if existing is None:
                raise HTTPException(status_code=404, detail="Discover post not found.")
            if int(existing["user_id"]) != user_id:
                raise HTTPException(status_code=403, detail="You can only delete your own Discover posts.")

            conn.execute("DELETE FROM discover_posts WHERE id = ?", (post_id,))
            conn.commit()
        finally:
            conn.close()


def _row_to_discover_post(row: sqlite3.Row) -> dict[str, Any]:
    quiz = json.loads(row["quiz_json"])
    discover_meta = quiz.get("discoverMeta") if isinstance(quiz.get("discoverMeta"), dict) else {}
    discover_meta.update(
        {
            "title": row["title"],
            "author": row["author"],
            "category": row["category"],
            "difficulty": row["difficulty"],
            "plays": int(row["plays"]),
            "estimatedTime": row["estimated_time"],
            "questionCount": int(row["questions_count"]),
            "rating": float(row["rating"]),
        }
    )
    quiz["discoverMeta"] = discover_meta
    return {
        "id": int(row["id"]),
        "user_id": int(row["user_id"]),
        "title": row["title"],
        "category": row["category"],
        "author": row["author"],
        "plays": int(row["plays"]),
        "rating": float(row["rating"]),
        "difficulty": row["difficulty"],
        "estimated_time": row["estimated_time"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "questions_count": int(row["questions_count"]),
        "quiz": quiz,
    }
