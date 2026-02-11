from os import getenv
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Callable
from starlette.middleware.base import BaseHTTPMiddleware

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
from dotenv import load_dotenv
from redis.asyncio import Redis

load_dotenv()


REDIS_URL = getenv('REDIS_BACKEND', 'redis://localhost:6379/0')
DEFAULT_RATE_LIMIT = getenv('DEFAULT_RATE_LIMITER', '1/hour')
AUTH_RATE_LIMIT = getenv('AUTH_RATE_LIMITER', '5/minute')
ENROLL_RATE_LIMIT = getenv('ENROLL_RATE_LIMITER', '10/minute')
SERVICE_RATE_LIMIT = getenv('SERVICE_RATE_LIMITER', '20/minute')


def parse_rate_limit_string(limit_string: str) -> tuple[int, int]:
    if not limit_string:
        return (100, 3600)

    times, period = limit_string.split('/')
    times = int(times)

    period_map = {
        'second': 1,
        'minute': 60,
        'hour': 3600,
        'day': 86400
    }

    period_clean = period.lower().rstrip('s')
    seconds = period_map.get(period_clean, 60)

    return (times, seconds)


def create_rate_limiter(limit_string: str) -> RateLimiter:
    times, seconds = parse_rate_limit_string(limit_string)
    return RateLimiter(times=times, seconds=seconds)


async def init_rate_limiter():
    global _redis_connection
    _redis_connection = await Redis.from_url(REDIS_URL)
    await FastAPILimiter.init(
        redis=_redis_connection,
        prefix="rl"
    )


async def close_rate_limiter():
    global _redis_connection
    await FastAPILimiter.close()
    if _redis_connection:
        await _redis_connection.close()
        _redis_connection = None

_redis_connection = None


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        global _redis_connection

        EXCLUDED_PATHS = ['/docs', '/redoc', '/openapi.json', '/']

        if any(request.url.path.startswith(path) for path in EXCLUDED_PATHS):
            return await call_next(request)

        if not _redis_connection:
            return await call_next(request)

        times, seconds = parse_rate_limit_string(DEFAULT_RATE_LIMIT)

        key = request.client.host if request.client else "unknown"
        redis_key = f"rl:{key}:{request.url.path}"

        try:
            current = await _redis_connection.incr(redis_key)

            if current == 1:
                await _redis_connection.expire(redis_key, seconds)

            if current > times:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": f"Превышен лимит запросов. Максимум {times} запросов в {seconds} секунд."
                    },
                    headers={"Retry-After": str(seconds)}
                )

            return await call_next(request)
        except Exception:
            return await call_next(request)


@asynccontextmanager
async def lifespan(app) -> AsyncGenerator:
    await init_rate_limiter()
    yield
    await close_rate_limiter()

#demo hold mvp confirm