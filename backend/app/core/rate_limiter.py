"""
In-memory sliding-window rate limiter for protecting expensive AI endpoints.

IMPORTANT ARCHITECTURAL NOTICE:
This in-memory sliding-window rate limiter is process-local. It tracks request
timestamps within the current running ASGI worker process to protect against
rapid automated bursts and accidental request flooding.
In a multi-worker or multi-instance deployment, an in-memory limiter is process-local
and is NOT sufficient by itself for distributed enforcement; a shared Redis-backed
distributed limiter (e.g., via arq or redis-py) must be used.
"""

import time
import threading
from typing import Dict, List
from fastapi import Request, HTTPException, Depends
from app.core.config import settings
from app.core.security import verify_guest_or_user


class SlidingWindowRateLimiter:
    """
    Sliding window rate limiter storing unix timestamps per client key.
    Thread-safe with a re-entrant lock.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._records: Dict[str, List[float]] = {}

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int = 60) -> tuple[bool, int]:
        """
        Checks if a client key has exceeded max_requests in window_seconds.
        Returns: (is_limited: bool, retry_after_seconds: int)
        """
        now = time.time()
        with self._lock:
            timestamps = self._records.get(key, [])
            # Purge timestamps outside the active window
            cutoff = now - window_seconds
            valid_timestamps = [ts for ts in timestamps if ts > cutoff]

            if len(valid_timestamps) >= max_requests:
                earliest = valid_timestamps[0]
                retry_after = max(1, int(earliest + window_seconds - now) + 1)
                self._records[key] = valid_timestamps
                return True, retry_after

            valid_timestamps.append(now)
            self._records[key] = valid_timestamps
            return False, 0

    def reset(self):
        """Clears all stored rate limit records (used in test fixtures)."""
        with self._lock:
            self._records.clear()


# Global rate limiter instance
limiter = SlidingWindowRateLimiter()


def resolve_client_ip(request: Request) -> str:
    """
    Resolves client IP securely.
    Only trusts X-Forwarded-For if settings.TRUST_PROXY_HEADERS is explicitly True.
    """
    if settings.TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # First IP in the list represents client IP according to proxy convention
            return forwarded.split(",")[0].strip()

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


async def check_ai_rate_limit(
    request: Request,
    token_data: dict = Depends(verify_guest_or_user)
) -> dict:
    """
    FastAPI dependency that enforces sliding-window frequency limits on AI endpoints.
    - Authenticated users are keyed by verified token UID.
    - Guests/anonymous users are keyed by resolved client IP.
    Returns token_data if allowed, otherwise raises 429 with Retry-After header.
    """
    is_guest = token_data.get("is_guest", False)

    if is_guest:
        client_ip = resolve_client_ip(request)
        rate_key = f"guest:{client_ip}"
        max_requests = settings.RATE_LIMIT_GUEST_AI_PER_MINUTE
    else:
        uid = token_data.get("uid", "unknown_user")
        rate_key = f"user:{uid}"
        max_requests = settings.RATE_LIMIT_USER_AI_PER_MINUTE

    is_limited, retry_after = limiter.is_rate_limited(
        key=rate_key,
        max_requests=max_requests,
        window_seconds=60
    )

    if is_limited:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {max_requests} requests per minute allowed.",
            headers={"Retry-After": str(retry_after)}
        )

    return token_data
