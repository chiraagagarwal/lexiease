from arq.connections import RedisSettings
from app.core.config import settings

redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)

class WorkerSettings:
    functions = [] # To be populated by worker.py
    redis_settings = redis_settings
    max_tries = 3
