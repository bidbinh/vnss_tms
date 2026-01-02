from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://tms_user:tms_pass@127.0.0.1:5432/tms")
    SQL_ECHO: bool = False
    JWT_SECRET: str = "change_me"
    JWT_ALG: str = "HS256"
    STORAGE_DIR: str = "storage"
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://127.0.0.1:3001/api/v1")

settings = Settings()
