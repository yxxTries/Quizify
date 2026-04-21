from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response

from controllers import auth_controller
from core.config import REFRESH_TOKEN_COOKIE
from middleware.auth_middleware import CurrentUser
from middleware.rate_limit import rate_limit
from schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    dependencies=[Depends(rate_limit(limit=8, window_seconds=60))],
)
def register(request: RegisterRequest, response: Response):
    return auth_controller.register(response=response, email=request.email, password=request.password)


@router.post(
    "/login",
    response_model=UserResponse,
    dependencies=[Depends(rate_limit(limit=10, window_seconds=60))],
)
def login(request: LoginRequest, response: Response):
    return auth_controller.login(response=response, email=request.email, password=request.password)


@router.post(
    "/refresh",
    response_model=UserResponse,
    dependencies=[Depends(rate_limit(limit=30, window_seconds=60))],
)
def refresh(
    response: Response,
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_TOKEN_COOKIE)] = None,
):
    user = auth_controller.refresh(response=response, refresh_token=refresh_token)
    return UserResponse(id=user.id, email=user.email, username=user.username)


@router.post("/logout", response_model=MessageResponse)
def logout(response: Response):
    data = auth_controller.logout(response=response)
    return MessageResponse.model_validate(data)


@router.get("/me", response_model=UserResponse)
def me(current_user: CurrentUser):
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
def update_me(request: UpdateProfileRequest, current_user: CurrentUser):
    return auth_controller.update_profile(
        user_id=current_user["id"],
        email=request.email,
        username=request.username,
    )


@router.post("/change-password", response_model=MessageResponse)
def change_password(request: ChangePasswordRequest, current_user: CurrentUser):
    data = auth_controller.change_password(
        user_id=current_user["id"],
        current_password=request.current_password,
        new_password=request.new_password,
    )
    return MessageResponse.model_validate(data)


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    dependencies=[Depends(rate_limit(limit=5, window_seconds=60))],
)
def forgot_password(request: ForgotPasswordRequest):
    return auth_controller.forgot_password(email=request.email)


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    dependencies=[Depends(rate_limit(limit=10, window_seconds=60))],
)
def reset_password(request: ResetPasswordRequest):
    data = auth_controller.reset_password_controller(token=request.token, new_password=request.new_password)
    return MessageResponse.model_validate(data)
