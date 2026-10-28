import logging
from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

logger = logging.getLogger(__name__)

def create_db_engine():
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite"):
        return create_engine(db_url, connect_args={"check_same_thread": False}, echo=False)
    try:
        eng = create_engine(db_url, connect_args={"connect_timeout": 1}, pool_pre_ping=True, echo=False)
        with eng.connect():
            pass
        return eng
    except Exception as e:
        logger.warning("Could not connect to PostgreSQL (%s). Falling back to SQLite.", e)
        sqlite_eng = create_engine("sqlite:///./lexiease.db", connect_args={"check_same_thread": False}, echo=False)
        SQLModel.metadata.create_all(sqlite_eng)
        return sqlite_eng

engine = create_db_engine()

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
