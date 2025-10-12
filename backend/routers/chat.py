from fastapi import APIRouter, Depends, HTTPException
from models import schemas, database_models
from database.database_config import get_db
from core.security import get_current_active_user
from services.ai_service import AIService
from sqlalchemy.orm import Session

router = APIRouter()

@router.post("/chat", response_model=schemas.ChatResponse)
async def chat_with_ai(
    chat_message: schemas.ChatMessage,
    db: Session = Depends(get_db),
    current_user: database_models.User = Depends(get_current_active_user),
):
    """Send a message to AI mentor and get response"""
    ai_service = AIService()
    context = chat_message.context or {}
    try:
        response_text = await ai_service.get_chat_response(chat_message.message, context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI chat failed: {str(e)}")

    # Save chat history
    chat_history = database_models.ChatHistory(
        user_id=current_user.id,
        question=chat_message.message,
        ai_response=response_text,
        context=context,
        model_used="gpt-4"
    )
    db.add(chat_history)
    db.commit()
    db.refresh(chat_history)

    return schemas.ChatResponse(
        response=response_text,
        model_used="gpt-4",
        timestamp=chat_history.timestamp,
        context=context
    )
