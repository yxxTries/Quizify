from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


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


class UserResponse(BaseModel):
    id: int
    email: EmailStr


class MessageResponse(BaseModel):
    message: str


class ForgotPasswordResponse(MessageResponse):
    reset_token: str | None = None
