from collections import deque
from threading import Lock
from time import time

from fastapi import HTTPException, Request

_RATE_MAP: dict[str, deque[float]] = {}
_RATE_LOCK = Lock()


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def rate_limit(limit: int, window_seconds: int):
    async def dependency(request: Request) -> None:
        now = time()
        key = f"{request.url.path}:{_client_ip(request)}"
        with _RATE_LOCK:
            bucket = _RATE_MAP.setdefault(key, deque())
            while bucket and bucket[0] <= now - window_seconds:
                bucket.popleft()
            if len(bucket) >= limit:
                raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
            bucket.append(now)

    return dependency
