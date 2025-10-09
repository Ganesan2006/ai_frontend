# ai_learning_platform/backend/config/settings.py

from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Application Settings
    APP_NAME: str = "AI Learning Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # API Settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_PREFIX: str = "/api"
    
    # Database Settings
    DATABASE_URL: str = "sqlite:///./data/ai_learning.db"
    
    # Security Settings
    SECRET_KEY: str = "a-very-secret-key-that-you-should-change"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # AI Model Settings
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4"
    
    # Logging Settings
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/app.log"
    LOG_FORMAT: str = "{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}"
    
    # CORS Settings
    CORS_ORIGINS: list = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create a singleton instance to be imported across the app
settings = Settings()
