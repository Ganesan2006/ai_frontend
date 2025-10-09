import openai
import os
from typing import List, Dict

openai.api_key = os.getenv("OPENAI_API_KEY")

class AIService:
    @staticmethod
    async def generate_roadmap(user_profile: Dict, goal: str, tech_stack: List[str]) -> Dict:
        prompt = f"""Create a personalized learning roadmap for:
        Background: {user_profile.get('background')}
        Current Role: {user_profile.get('current_role')}
        Current Skills: {', '.join(user_profile.get('skills', []))}
        Target Role: {goal}
        Tech Stack: {', '.join(tech_stack)}
        
        Generate a structured learning path with 15-20 modules covering beginner to advanced levels.
        Include module titles, descriptions, difficulty, estimated hours, and prerequisites.
        Format as JSON."""
        
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        return response.choices[0].message.content
    
    @staticmethod
    async def generate_module_content(module_title: str, user_background: str) -> str:
        prompt = f"""Create detailed learning content for: {module_title}
        Tailor explanations for someone with {user_background} background.
        Include:
        1. Concept explanation with relevant analogies
        2. Code examples with comments
        3. Practice exercises
        4. Real-world applications"""
        
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        return response.choices[0].message.content
    
    @staticmethod
    async def chat_response(message: str, context: Dict) -> str:
        prompt = f"""You are an AI learning mentor. User is currently on module: {context.get('current_module')}
        Background: {context.get('user_background')}
        Question: {message}
        
        Provide helpful guidance using the Socratic method - guide them to discover answers."""
        
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8
        )
        return response.choices[0].message.content
