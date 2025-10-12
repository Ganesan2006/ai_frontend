# ai_learning_platform/backend/app/services/ai_service.py

import openai
from config.settings import settings
from typing import Dict, List
import json

class AIService:
    def __init__(self):
        openai.api_key = settings.OPENAI_API_KEY

    async def generate_roadmap(
        self, user_profile: Dict, goal: str, tech_stack: List[str], timeline_weeks: int
    ) -> Dict:
        """Generates a personalized learning roadmap"""
        prompt = f"""
        Generate a detailed, personalized learning roadmap for a user with the following profile:
        - Background: {user_profile.get('background', 'N/A')}
        - Current Role: {user_profile.get('current_role', 'N/A')}
        - Existing Skills: {', '.join(user_profile.get('skills', []))}
        - Target Role/Goal: {goal}
        - Desired Tech Stack: {', '.join(tech_stack)}
        - Timeline: {timeline_weeks} weeks

        The roadmap should be structured as a JSON object with a single key "modules".
        The "modules" value should be a list of 15-20 JSON objects, each representing a learning module.
        Each module object must have these keys: "title", "description", "difficulty" (beginner, intermediate, or advanced), 
        "estimated_hours" (float), and "learning_objectives" (list of strings).
        Ensure the modules logically progress from beginner to advanced.
        Example module: {{"title": "Intro to Python", "description": "...", "difficulty": "beginner", "estimated_hours": 4.0, "learning_objectives": ["..."]}}
        """
        response = await openai.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=settings.OPENAI_TEMPERATURE,
            max_tokens=settings.OPENAI_MAX_TOKENS,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)

    async def get_chat_response(self, message: str, context: Dict) -> str:
        """Generates a response from the AI mentor."""
        prompt = f"""
        You are an AI learning mentor. A user needs help.
        User's Background: {context.get('user_background')}
        Current Module: {context.get('current_module_title')}
        
        User's Question: "{message}"

        Your task is to guide the user to the answer using the Socratic method.
        Do not give the direct answer. Instead, ask probing questions to help them think.
        Keep your response concise and encouraging.
        """
        response = await openai.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "system", "content": prompt}],
            temperature=0.8,
        )
        return response.choices[0].message.content
