# ai_learning_platform/frontend/pages/02_Roadmap.py
import streamlit as st
from components.module_card import show_module_card

st.title("🗺️ Learning Roadmap")
st.write("Your personalized learning path.")

# Placeholder roadmap data
modules = [
    {"title": "Introduction to Python", "difficulty": "Beginner", "status": "Completed"},
    {"title": "Data Structures", "difficulty": "Intermediate", "status": "In Progress"},
    {"title": "API Development with FastAPI", "difficulty": "Intermediate", "status": "Not Started"},
]

for module in modules:
    show_module_card(module["title"], module["difficulty"], module["status"])
    st.divider()

