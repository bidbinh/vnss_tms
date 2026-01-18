from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://tms_user:tms_pass@127.0.0.1:5432/tms")
    SQL_ECHO: bool = False
    JWT_SECRET: str = "change_me"
    JWT_ALG: str = "HS256"
    STORAGE_DIR: str = "storage"
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://127.0.0.1:3001/api/v1")

    # Database pool settings for high traffic
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "50"))  # Base connections
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "100"))  # Extra connections when needed
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))  # Wait time for connection
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))  # Recycle connections every 30 mins

    # Google Maps API (optional, for geocoding and distance calculation)
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")

settings = Settings()
