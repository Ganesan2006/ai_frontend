from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models import schemas, database_models
from backend.app.database.database_config import get_db
from backend.app.core.security import get_current_active_user
from backend.app.services.ai_service import AIService

router = APIRouter()

@router.post("/roadmap/generate", status_code=status.HTTP_201_CREATED)
async def generate_roadmap(
    roadmap_data: schemas.RoadmapGenerate,
    db: Session = Depends(get_db),
    current_user: database_models.User = Depends(get_current_active_user),
):
    """Generate a personalized roadmap using AI"""
    ai_service = AIService()
    try:
        roadmap_json = await ai_service.generate_roadmap(
            {
                "background": current_user.background,
                "current_role": current_user.current_role,
                "skills": current_user.skills or [],
            },
            roadmap_data.goal,
            roadmap_data.tech_stack,
            roadmap_data.timeline_weeks,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    roadmap = database_models.Roadmap(
        user_id=current_user.id,
        goal=roadmap_data.goal,
        tech_stack=roadmap_data.tech_stack,
        total_modules=len(roadmap_json.get("modules", [])),
        estimated_weeks=roadmap_data.timeline_weeks,
    )
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)

    for order, module_data in enumerate(roadmap_json.get("modules", [])):
        module = database_models.Module(
            roadmap_id=roadmap.id,
            title=module_data["title"],
            description=module_data.get("description"),
            difficulty=module_data.get("difficulty", "beginner"),
            estimated_hours=module_data.get("estimated_hours", 1.0),
            content=module_data.get("content", ""),
            order=order,
            prerequisites=module_data.get("prerequisites", []),
            resources=module_data.get("resources", {}),
            learning_objectives=module_data.get("learning_objectives", []),
        )
        db.add(module)
    db.commit()

    return {"message": "Roadmap generated successfully", "roadmap_id": roadmap.id}

@router.get("/roadmap/me", response_model=schemas.RoadmapResponse)
def get_my_roadmap(
    db: Session = Depends(get_db),
    current_user: database_models.User = Depends(get_current_active_user),
):
    """Get the user's active roadmap"""
    roadmap = db.query(database_models.Roadmap).filter(
        database_models.Roadmap.user_id == current_user.id,
        database_models.Roadmap.is_active == True
    ).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="No active roadmap found")
    return roadmap
