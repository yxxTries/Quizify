from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Any

import bcrypt
import jwt

from core.config import (
    ACCESS_TOKEN_EXPIRES_MINUTES,
    JWT_ACCESS_SECRET,
    JWT_ISSUER,
    JWT_REFRESH_SECRET,
    REFRESH_TOKEN_EXPIRES_DAYS,
)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(subject: str) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=ACCESS_TOKEN_EXPIRES_MINUTES)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "access",
        "iss": JWT_ISSUER,
        "exp": expires_at,
    }
    return jwt.encode(payload, JWT_ACCESS_SECRET, algorithm="HS256")


def create_refresh_token(subject: str) -> str:
    expires_at = datetime.now(UTC) + timedelta(days=REFRESH_TOKEN_EXPIRES_DAYS)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "refresh",
        "iss": JWT_ISSUER,
        "exp": expires_at,
    }
    return jwt.encode(payload, JWT_REFRESH_SECRET, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, JWT_ACCESS_SECRET, algorithms=["HS256"], issuer=JWT_ISSUER)


def decode_refresh_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, JWT_REFRESH_SECRET, algorithms=["HS256"], issuer=JWT_ISSUER)


def hash_reset_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()
