# ai_learning_platform/frontend/utils/session.py
import streamlit as st

def set_token(token):
    st.session_state["token"] = token

def get_token():
    return st.session_state.get("token", None)

def clear_token():
    if "token" in st.session_state:
        del st.session_state["token"]
