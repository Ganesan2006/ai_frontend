import streamlit as st
import requests
from datetime import datetime

# Configuration
API_URL = "http://localhost:8000"

st.set_page_config(page_title="AI Learning Platform", page_icon="🎓", layout="wide")

# Session state initialization
if 'token' not in st.session_state:
    st.session_state.token = None
if 'user_id' not in st.session_state:
    st.session_state.user_id = None

def main():
    if not st.session_state.token:
        show_login_page()
    else:
        show_dashboard()

def show_login_page():
    st.title("🎓 AI Learning Platform")
    
    tab1, tab2 = st.tabs(["Login", "Register"])
    
    with tab1:
        st.subheader("Login")
        email = st.text_input("Email", key="login_email")
        password = st.text_input("Password", type="password", key="login_password")
        
        if st.button("Login"):
            response = requests.post(f"{API_URL}/api/auth/login", json={
                "email": email,
                "password": password
            })
            if response.status_code == 200:
                data = response.json()
                st.session_state.token = data['access_token']
                st.success("Logged in successfully!")
                st.rerun()
            else:
                st.error("Invalid credentials")
    
    with tab2:
        st.subheader("Create Account")
        name = st.text_input("Full Name")
        email = st.text_input("Email", key="register_email")
        password = st.text_input("Password", type="password", key="register_password")
        background = st.selectbox("Educational Background", ["CS", "EEE", "Mechanical", "Non-tech"])
        current_role = st.text_input("Current Role")
        target_role = st.text_input("Target Role")
        
        if st.button("Register"):
            response = requests.post(f"{API_URL}/api/auth/register", json={
                "name": name,
                "email": email,
                "password": password,
                "background": background,
                "current_role": current_role,
                "target_role": target_role
            })
            if response.status_code == 200:
                st.success("Account created! Please login.")
            else:
                st.error("Registration failed")

def show_dashboard():
    st.sidebar.title("Navigation")
    page = st.sidebar.radio("Go to", ["Dashboard", "My Roadmap", "Learning Modules", "AI Mentor", "Progress"])
    
    if st.sidebar.button("Logout"):
        st.session_state.token = None
        st.rerun()
    
    if page == "Dashboard":
        show_dashboard_page()
    elif page == "My Roadmap":
        show_roadmap_page()
    elif page == "AI Mentor":
        show_chat_page()

def show_dashboard_page():
    st.title("📊 Learning Dashboard")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Completed Modules", "12/50")
    with col2:
        st.metric("Average Score", "85%")
    with col3:
        st.metric("Learning Streak", "7 days")

def show_roadmap_page():
    st.title("🗺️ Your Learning Roadmap")
    st.write("Generate your personalized learning path")
    
    goal = st.text_input("What do you want to become?", "Data Scientist")
    tech_stack = st.multiselect("Tech Stack", ["Python", "SQL", "Machine Learning", "Deep Learning", "AWS"])
    
    if st.button("Generate Roadmap"):
        with st.spinner("AI is creating your personalized roadmap..."):
            # Call API to generate roadmap
            st.success("Roadmap generated!")

def show_chat_page():
    st.title("💬 AI Mentor")
    
    for message in st.session_state.get('messages', []):
        with st.chat_message(message["role"]):
            st.write(message["content"])
    
    if prompt := st.chat_input("Ask your AI mentor..."):
        st.session_state.setdefault('messages', []).append({"role": "user", "content": prompt})
        # Call AI API here
        response = "This is where AI response would appear"
        st.session_state.messages.append({"role": "assistant", "content": response})
        st.rerun()

if __name__ == "__main__":
    main()
