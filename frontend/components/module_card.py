# ai_learning_platform/frontend/components/module_card.py

import streamlit as st

def show_module_card(title: str, difficulty: str, status: str, description: str = ""):
    """
    Displays a card for a learning module.
    """
    status_colors = {
        "Completed": "green",
        "In Progress": "orange",
        "Not Started": "grey"
    }
    
    with st.container():
        st.markdown(f"#### {title}")
        st.markdown(f"**Difficulty:** {difficulty.capitalize()} | **Status:** :{status_colors.get(status, 'grey')}[{status}]")
        if description:
            st.write(description)
