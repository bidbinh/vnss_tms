from sqlmodel import create_engine, Session
from app.core.config import settings

# High-performance database engine with connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.SQL_ECHO,
    pool_pre_ping=True,  # Check connection before use
    pool_size=settings.DB_POOL_SIZE,  # Base connections in pool
    max_overflow=settings.DB_MAX_OVERFLOW,  # Extra connections when pool is exhausted
    pool_timeout=settings.DB_POOL_TIMEOUT,  # Wait time for connection
    pool_recycle=settings.DB_POOL_RECYCLE,  # Recycle stale connections
)

def get_session():
    with Session(engine) as session:
        yield session
