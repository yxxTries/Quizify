import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status

from core.config import RESET_TOKEN_EXPIRES_MINUTES
from core.security import hash_password, hash_reset_token, verify_password
from services.user_service import (
    create_user,
    get_user_auth_by_id,
    get_user_by_email,
    get_user_by_id,
    get_user_by_reset_token_hash,
    save_password_reset_token,
    update_user_profile,
    update_user_password,
)


def validate_password_strength(password: str) -> None:
    if len(password) < 8 or len(password) > 72:
        raise HTTPException(status_code=400, detail="Password must be between 8 and 72 characters.")
    if not any(c.islower() for c in password):
        raise HTTPException(status_code=400, detail="Password must include a lowercase letter.")
    if not any(c.isupper() for c in password):
        raise HTTPException(status_code=400, detail="Password must include an uppercase letter.")
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password must include a number.")
    if not any(not c.isalnum() for c in password):
        raise HTTPException(status_code=400, detail="Password must include a symbol.")


def register_user(email: str, password: str) -> dict:
    validate_password_strength(password)
    existing = get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    pw_hash = hash_password(password)
    return create_user(email=email, password_hash=pw_hash)


def authenticate_user(email: str, password: str) -> dict:
    user = get_user_by_email(email)
    if user is None or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    return {"id": user["id"], "email": user["email"], "username": user["username"]}


def load_user(user_id: int) -> dict:
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    return user


def update_account_profile(user_id: int, email: str, username: str) -> dict:
    try:
        return update_user_profile(user_id=user_id, email=email, username=username)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def change_account_password(user_id: int, current_password: str, new_password: str) -> None:
    user = get_user_auth_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    if not verify_password(current_password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect.")
    if current_password == new_password:
        raise HTTPException(status_code=400, detail="New password must be different from the current password.")

    validate_password_strength(new_password)
    pw_hash = hash_password(new_password)
    update_user_password(user_id=user_id, password_hash=pw_hash)


def create_password_reset_token(email: str) -> str | None:
    user = get_user_by_email(email)
    if user is None:
        return None

    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_reset_token(raw_token)
    expires_at = datetime.now(UTC) + timedelta(minutes=RESET_TOKEN_EXPIRES_MINUTES)
    save_password_reset_token(email=email, token_hash=token_hash, expires_at=expires_at)
    return raw_token


def reset_password(token: str, new_password: str) -> None:
    validate_password_strength(new_password)

    token_hash = hash_reset_token(token)
    user = get_user_by_reset_token_hash(token_hash)
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    expires_raw = user.get("reset_token_expires_at")
    if not expires_raw:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    expires_at = datetime.fromisoformat(expires_raw)
    if expires_at < datetime.now(UTC):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    pw_hash = hash_password(new_password)
    update_user_password(user_id=user["id"], password_hash=pw_hash)
