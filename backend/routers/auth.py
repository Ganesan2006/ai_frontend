# ai_learning_platform/backend/app/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models import schemas, database_models
from database.database_config import get_db
from core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_active_user,
)

router = APIRouter()

@router.post("/auth/register", response_model=schemas.UserProfile, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Create a new user."""
    db_user = db.query(database_models.User).filter(database_models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = database_models.User(
        email=user.email,
        name=user.name,
        password_hash=hashed_password,
        **user.model_dump(exclude={"password", "email", "name"})
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/auth/login", response_model=schemas.Token)
def login_for_access_token(form_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token."""
    user = db.query(database_models.User).filter(database_models.User.email == form_data.email).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=schemas.UserProfile)
def read_users_me(current_user: database_models.User = Depends(get_current_active_user)):
    """Get current user's profile."""
    return current_user
