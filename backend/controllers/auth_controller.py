import jwt
from fastapi import HTTPException, Response, status

from core.config import (
    ACCESS_TOKEN_COOKIE,
    ACCESS_TOKEN_EXPIRES_MINUTES,
    COOKIE_SAMESITE,
    COOKIE_SECURE,
    ENABLE_INSECURE_RESET_TOKEN_RESPONSE,
    REFRESH_TOKEN_COOKIE,
    REFRESH_TOKEN_EXPIRES_DAYS,
)
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from schemas.auth import ForgotPasswordResponse, UserResponse
from services.auth_service import (
    authenticate_user,
    create_password_reset_token,
    load_user,
    register_user,
    reset_password,
)


def _set_auth_cookies(response: Response, user_id: int) -> None:
    access_token = create_access_token(str(user_id))
    refresh_token = create_refresh_token(str(user_id))

    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=ACCESS_TOKEN_EXPIRES_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(key=ACCESS_TOKEN_COOKIE, path="/")
    response.delete_cookie(key=REFRESH_TOKEN_COOKIE, path="/")


def register(response: Response, email: str, password: str) -> UserResponse:
    user = register_user(email=email, password=password)
    _set_auth_cookies(response=response, user_id=user["id"])
    return UserResponse.model_validate(user)


def login(response: Response, email: str, password: str) -> UserResponse:
    user = authenticate_user(email=email, password=password)
    _set_auth_cookies(response=response, user_id=user["id"])
    return UserResponse.model_validate(user)


def refresh(response: Response, refresh_token: str | None) -> UserResponse:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is missing.")

    try:
        payload = decode_refresh_token(refresh_token)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token.") from exc

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

    subject = payload.get("sub")
    if not subject or not str(subject).isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject.")

    user_id = int(subject)
    _set_auth_cookies(response=response, user_id=user_id)
    user = load_user(user_id)
    return UserResponse.model_validate(user)


def logout(response: Response) -> dict[str, str]:
    _clear_auth_cookies(response)
    return {"message": "Logged out."}


def forgot_password(email: str) -> ForgotPasswordResponse:
    token = create_password_reset_token(email)
    response = ForgotPasswordResponse(message="If this email exists, a reset link has been generated.")
    if token and ENABLE_INSECURE_RESET_TOKEN_RESPONSE:
        response.reset_token = token
    return response


def reset_password_controller(token: str, new_password: str) -> dict[str, str]:
    reset_password(token=token, new_password=new_password)
    return {"message": "Password reset successful."}
