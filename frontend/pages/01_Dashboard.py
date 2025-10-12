# ai_learning_platform/frontend/pages/01_Dashboard.py
import streamlit as st

st.title("📊 Dashboard")
st.write("Overview of your learning progress and performance.")

# Placeholder metrics
col1, col2, col3 = st.columns(3)
col1.metric("Completed Modules", "5", "2")
col2.metric("Average Score", "88%", "4%")
col3.metric("Current Streak", "12 days", "🔥")
