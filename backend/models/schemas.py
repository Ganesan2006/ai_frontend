# ai_learning_platform/backend/app/models/schemas.py

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ============== User Schemas ==============
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    background: Optional[str] = None
    current_role: Optional[str] = None
    target_role: Optional[str] = None
    years_experience: Optional[int] = 0
    skills: Optional[List[str]] = []
    learning_intensity: Optional[str] = "moderate"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(UserBase):
    id: int
    background: Optional[str]
    current_role: Optional[str]
    target_role: Optional[str]
    years_experience: int
    skills: Optional[List[str]]
    learning_intensity: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    background: Optional[str] = None
    current_role: Optional[str] = None
    target_role: Optional[str] = None
    skills: Optional[List[str]] = None

# ============== Auth Schemas ==============
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

# ============== Roadmap Schemas ==============
class RoadmapGenerate(BaseModel):
    goal: str = Field(..., description="Target role or learning goal")
    tech_stack: List[str] = Field(..., description="Technologies to learn")
    timeline_weeks: int = Field(12, ge=1, le=52)
    current_skills: List[str] = []

class RoadmapResponse(BaseModel):
    id: int
    goal: str
    tech_stack: List[str]
    total_modules: int
    completed_modules: int
    estimated_weeks: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class RoadmapDetail(RoadmapResponse):
    modules: List["ModuleResponse"]

# ============== Module Schemas ==============
class ModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    difficulty: str = Field(..., pattern="^(beginner|intermediate|advanced)$")
    estimated_hours: float = Field(1.0, ge=0.5, le=40)

class ModuleCreate(ModuleBase):
    roadmap_id: int
    content: str
    order: int
    prerequisites: Optional[List[int]] = []
    resources: Optional[Dict[str, Any]] = {}

class ModuleResponse(ModuleBase):
    id: int
    roadmap_id: int
    content: str
    order: int
    prerequisites: Optional[List[int]]
    resources: Optional[Dict[str, Any]]
    learning_objectives: Optional[List[str]]
    
    class Config:
        from_attributes = True

# ============== Progress Schemas ==============
class ProgressUpdate(BaseModel):
    module_id: int
    status: str = Field(..., pattern="^(not_started|in_progress|completed)$")
    score: Optional[float] = Field(None, ge=0, le=100)
    time_spent: Optional[float] = Field(None, ge=0)

class ProgressResponse(BaseModel):
    id: int
    user_id: int
    module_id: int
    status: str
    score: Optional[float]
    time_spent: float
    attempts: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    next_review: Optional[datetime]
    
    class Config:
        from_attributes = True

# ============== Chat Schemas ==============
class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    model_used: str
    timestamp: datetime
    context: Optional[Dict[str, Any]]

# ============== Assessment Schemas ==============
class QuestionSchema(BaseModel):
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None

class AssessmentCreate(BaseModel):
    module_id: int
    title: str
    questions: List[QuestionSchema]
    type: str = "quiz"
    passing_score: float = 70.0

class AssessmentSubmit(BaseModel):
    assessment_id: int
    answers: Dict[int, str]  # question_index: user_answer

class AssessmentResult(BaseModel):
    score: float
    passed: bool
    total_questions: int
    correct_answers: int
    feedback: List[Dict[str, Any]]

# ============== Analytics Schemas ==============
class UserAnalytics(BaseModel):
    total_modules: int
    completed_modules: int
    in_progress_modules: int
    average_score: float
    total_time_spent: float
    learning_streak: int
    badges_earned: int
    completion_rate: float
    modules_by_difficulty: Dict[str, int]
    weekly_progress: List[Dict[str, Any]]

class BadgeResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    icon: str
    category: str
    earned_at: datetime
    
    class Config:
        from_attributes = True
