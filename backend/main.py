# ai_learning_platform/backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, roadmap, progress, chat, analytics
from app.database.database_config import init_database
from config.settings import settings
from config.logging_config import get_logger

# Get logger for main application
logger = get_logger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API for the AI-Powered Personalized Learning Platform",
    debug=settings.DEBUG
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Event handler for startup
@app.on_event("startup")
def on_startup():
    """Run on application startup."""
    logger.info("🚀 Starting up the application...")
    init_database()
    logger.info("✓ Database initialization complete.")

# Include API routers
app.include_router(auth.router, prefix=settings.API_PREFIX, tags=["Authentication"])
app.include_router(roadmap.router, prefix=settings.API_PREFIX, tags=["Roadmap"])
app.include_router(progress.router, prefix=settings.API_PREFIX, tags=["Progress"])
app.include_router(chat.router, prefix=settings.API_PREFIX, tags=["Chat"])
app.include_router(analytics.router, prefix=settings.API_PREFIX, tags=["Analytics"])

@app.get("/", tags=["Root"])
def read_root():
    """Root endpoint to check API status."""
    return {"message": f"Welcome to {settings.APP_NAME} API v{settings.APP_VERSION}"}

# Main entry point for uvicorn
if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting server on {settings.API_HOST}:{settings.API_PORT}")
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
