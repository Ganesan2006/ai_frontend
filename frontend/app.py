# ai_learning_platform/frontend/app.py

import streamlit as st
from components import auth
from utils import session

st.set_page_config(
    page_title="AI Learning Platform",
    page_icon="🎓",
    layout="wide"
)

def main():
    if not session.get_token():
        st.title("Welcome to the AI Learning Platform 🎓")
        
        tab1, tab2 = st.tabs(["Login", "Register"])
        with tab1:
            auth.login_form()
        with tab2:
            auth.register_form()
    else:
        st.sidebar.title("Navigation")
        st.sidebar.info("Select a page from the list above.")
        
        if st.sidebar.button("Logout"):
            session.clear_token()
            st.experimental_rerun()

        st.write("# Welcome back!")
        st.write("Navigate to a page using the sidebar.")

if __name__ == "__main__":
    main()
