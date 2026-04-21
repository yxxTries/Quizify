from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class UpdateProfileRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=24)

    @field_validator("username")
    @classmethod
    def ensure_username_format(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Username is required.")
        if not all(char.isalnum() or char == "_" for char in normalized):
            raise ValueError("Username can only use letters, numbers, and underscores.")
        return normalized


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=256)
    new_password: str = Field(min_length=8, max_length=72)

    @field_validator("new_password")
    @classmethod
    def ensure_password_complexity(cls, value: str) -> str:
        if not any(c.islower() for c in value):
            raise ValueError("Password must include at least one lowercase letter.")
        if not any(c.isupper() for c in value):
            raise ValueError("Password must include at least one uppercase letter.")
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must include at least one number.")
        if not any(not c.isalnum() for c in value):
            raise ValueError("Password must include at least one symbol.")
        return value


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)

    @field_validator("new_password")
    @classmethod
    def ensure_new_password_complexity(cls, value: str) -> str:
        if not any(c.islower() for c in value):
            raise ValueError("Password must include at least one lowercase letter.")
        if not any(c.isupper() for c in value):
            raise ValueError("Password must include at least one uppercase letter.")
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must include at least one number.")
        if not any(not c.isalnum() for c in value):
            raise ValueError("Password must include at least one symbol.")
        return value


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str


class MessageResponse(BaseModel):
    message: str


class ForgotPasswordResponse(MessageResponse):
    reset_token: str | None = None
