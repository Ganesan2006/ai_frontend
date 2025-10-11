from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.models import schemas, database_models
from app.database.database_config import get_db
from app.core.security import get_current_active_user
from datetime import datetime

router = APIRouter()

@router.get("/progress/me", response_model=List[schemas.ProgressResponse])
def get_my_progress(
    db: Session = Depends(get_db),
    current_user: database_models.User = Depends(get_current_active_user),
):
    """Get progress for current user"""
    progress = db.query(database_models.Progress).filter(
        database_models.Progress.user_id == current_user.id
    ).all()
    return progress

@router.post("/progress/update")
def update_progress(
    progress_update: schemas.ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: database_models.User = Depends(get_current_active_user),
):
    """Update progress of a module"""
    progress = db.query(database_models.Progress).filter(
        database_models.Progress.user_id == current_user.id,
        database_models.Progress.module_id == progress_update.module_id
    ).first()

    if not progress:
        progress = database_models.Progress(
            user_id=current_user.id,
            module_id=progress_update.module_id,
            status=progress_update.status,
            score=progress_update.score or 0.0,
            time_spent=progress_update.time_spent or 0.0,
            attempts=1,
            started_at=datetime.utcnow() if progress_update.status != "not_started" else None,
            completed_at=datetime.utcnow() if progress_update.status == "completed" else None
        )
        db.add(progress)
    else:
        progress.status = progress_update.status
        if progress_update.score is not None:
            progress.score = progress_update.score
        if progress_update.time_spent is not None:
            progress.time_spent = progress_update.time_spent
        progress.attempts += 1
        if progress_update.status == "completed" and not progress.completed_at:
            progress.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(progress)
    return {"message": "Progress updated successfully", "progress_id": progress.id}
