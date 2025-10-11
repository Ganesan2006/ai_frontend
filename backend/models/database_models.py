# ai_learning_platform/backend/app/models/database_models.py

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database_config import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    background = Column(String(100))  # e.g., CS, EEE, Mechanical, Non-tech
    current_role = Column(String(100))
    target_role = Column(String(100))
    years_experience = Column(Integer, default=0)
    skills = Column(JSON, default=list)  # List of current skills
    learning_intensity = Column(String(20), default="moderate")  # e.g., low, moderate, high
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    roadmaps = relationship("Roadmap", back_populates="user", cascade="all, delete-orphan")
    progress = relationship("Progress", back_populates="user", cascade="all, delete-orphan")
    chat_history = relationship("ChatHistory", back_populates="user", cascade="all, delete-orphan")
    badges = relationship("Badge", back_populates="user", cascade="all, delete-orphan")


class Roadmap(Base):
    __tablename__ = "roadmaps"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    goal = Column(String(255), nullable=False)
    tech_stack = Column(JSON, default=list)  # List of technologies
    total_modules = Column(Integer, default=0)
    completed_modules = Column(Integer, default=0)
    estimated_weeks = Column(Integer, default=12)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="roadmaps")
    modules = relationship("Module", back_populates="roadmap", cascade="all, delete-orphan")


class Module(Base):
    __tablename__ = "modules"
    
    id = Column(Integer, primary_key=True, index=True)
    roadmap_id = Column(Integer, ForeignKey("roadmaps.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    content = Column(Text)  # AI-generated content
    difficulty = Column(String(20))  # e.g., beginner, intermediate, advanced
    estimated_hours = Column(Float, default=1.0)
    order = Column(Integer)  # Sequence in the roadmap
    prerequisites = Column(JSON, default=list)  # List of module IDs
    resources = Column(JSON, default=dict)  # e.g., Videos, articles, links
    code_snippets = Column(JSON, default=list)  # Code examples
    learning_objectives = Column(JSON, default=list)  # What user will learn
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    roadmap = relationship("Roadmap", back_populates="modules")
    progress = relationship("Progress", back_populates="module", cascade="all, delete-orphan")
    assessments = relationship("Assessment", back_populates="module", cascade="all, delete-orphan")


class Progress(Base):
    __tablename__ = "progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"))
    status = Column(String(20), default="not_started")  # e.g., not_started, in_progress, completed
    score = Column(Float)  # Quiz score (0-100)
    time_spent = Column(Float, default=0.0)  # Hours spent
    attempts = Column(Integer, default=0)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Spaced Repetition Fields
    last_review = Column(DateTime)
    next_review = Column(DateTime)
    review_count = Column(Integer, default=0)
    ease_factor = Column(Float, default=2.5)  # For FSRS algorithm
    interval_days = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="progress")
    module = relationship("Module", back_populates="progress")


class Assessment(Base):
    __tablename__ = "assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"))
    title = Column(String(255))
    questions = Column(JSON)  # List of question objects
    type = Column(String(50))  # e.g., quiz, coding_challenge, project
    passing_score = Column(Float, default=70.0)
    time_limit_minutes = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    module = relationship("Module", back_populates="assessments")


class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    question = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    context = Column(JSON)  # Current module, roadmap position, etc.
    model_used = Column(String(50))  # e.g., gpt-4, claude-3
    tokens_used = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="chat_history")


class Badge(Base):
    __tablename__ = "badges"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    description = Column(String(255))
    icon = Column(String(50))  # emoji or icon name
    category = Column(String(50))  # e.g., completion, streak, performance
    earned_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="badges")


class LearningStreak(Base):
    __tablename__ = "learning_streaks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_activity_date = Column(DateTime)
    total_days_active = Column(Integer, default=0)
