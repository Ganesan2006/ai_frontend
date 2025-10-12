from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models import schemas, database_models
from database.database_config import get_db
from core.security import get_current_active_user
from typing import List, Dict, Any
from datetime import datetime, timedelta

router = APIRouter()  # Remove prefix and tags from here

@router.get("/dashboard", response_model=Dict[str, Any])
def get_dashboard_analytics(
    current_user: database_models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get overall dashboard analytics for the current user."""
    total_modules = db.query(database_models.Module).count()
    completed_modules = db.query(database_models.Progress).filter(
        database_models.Progress.user_id == current_user.id,
        database_models.Progress.completion_percentage == 100
    ).count()
    
    return {
        "user_id": current_user.id,
        "total_modules": total_modules,
        "completed_modules": completed_modules,
        "completion_rate": round((completed_modules / total_modules * 100), 2) if total_modules > 0 else 0,
        "total_study_hours": 0,
        "current_streak": 0,
        "last_activity": datetime.now().isoformat()
    }

@router.get("/progress-over-time")
def get_progress_over_time(
    days: int = 30,
    current_user: database_models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's learning progress over the specified time period."""
    cutoff_date = datetime.now() - timedelta(days=days)
    
    progress_records = db.query(database_models.Progress).filter(
        database_models.Progress.user_id == current_user.id,
        database_models.Progress.last_accessed >= cutoff_date
    ).all()
    
    return {
        "period_days": days,
        "total_records": len(progress_records),
        "progress_data": [
            {
                "module_id": record.module_id,
                "completion_percentage": record.completion_percentage,
                "last_accessed": record.last_accessed.isoformat() if record.last_accessed else None
            }
            for record in progress_records
        ]
    }

@router.get("/module-statistics/{module_id}")
def get_module_statistics(
    module_id: int,
    current_user: database_models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed statistics for a specific module."""
    module = db.query(database_models.Module).filter(
        database_models.Module.id == module_id
    ).first()
    
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    progress = db.query(database_models.Progress).filter(
        database_models.Progress.user_id == current_user.id,
        database_models.Progress.module_id == module_id
    ).first()
    
    return {
        "module_id": module_id,
        "module_title": module.title,
        "completion_percentage": progress.completion_percentage if progress else 0,
        "time_spent_minutes": progress.time_spent_minutes if progress else 0,
        "last_accessed": progress.last_accessed.isoformat() if progress and progress.last_accessed else None,
        "status": "completed" if progress and progress.completion_percentage == 100 else "in_progress" if progress else "not_started"
    }

@router.get("/learning-streak")
def get_learning_streak(
    current_user: database_models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Calculate the user's current learning streak."""
    return {
        "current_streak": 0,
        "longest_streak": 0,
        "last_activity_date": datetime.now().isoformat()
    }
