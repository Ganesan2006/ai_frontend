# ai_learning_platform/backend/config/logging_config.py

from loguru import logger
from app.config.settings import settings
import sys
import os

# Create logs directory
os.makedirs("logs", exist_ok=True)

# Remove default handler
logger.remove()

# Add console handler
logger.add(
    sys.stdout,
    format=settings.LOG_FORMAT,
    level=settings.LOG_LEVEL,
    colorize=True
)

# Add file handler
logger.add(
    settings.LOG_FILE,
    format=settings.LOG_FORMAT,
    level=settings.LOG_LEVEL,
    rotation="500 MB",
    retention="10 days",
    compression="zip"
)

def get_logger(name: str):
    """Get a logger instance for a specific module"""
    return logger.bind(module=name)
