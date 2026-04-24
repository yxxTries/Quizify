import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

ACCESS_TOKEN_COOKIE = "quizify_access_token"
REFRESH_TOKEN_COOKIE = "quizify_refresh_token"

JWT_ACCESS_SECRET = os.getenv("JWT_ACCESS_SECRET", "change-me-access-secret")
JWT_REFRESH_SECRET = os.getenv("JWT_REFRESH_SECRET", "change-me-refresh-secret")
JWT_ISSUER = os.getenv("JWT_ISSUER", "quizify")
ACCESS_TOKEN_EXPIRES_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRES_MINUTES", "15"))
REFRESH_TOKEN_EXPIRES_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRES_DAYS", "7"))
RESET_TOKEN_EXPIRES_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRES_MINUTES", "20"))

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")

DB_PATH = BASE_DIR / "users.db"

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

ENABLE_INSECURE_RESET_TOKEN_RESPONSE = (
    os.getenv("ENABLE_INSECURE_RESET_TOKEN_RESPONSE", "false").lower() == "true"
)
