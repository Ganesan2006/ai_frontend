# ai_learning_platform/frontend/pages/04_AI_Mentor.py
import streamlit as st

st.title("💬 AI Mentor Chat")

if "chat_messages" not in st.session_state:
    st.session_state["chat_messages"] = [
        {"role": "assistant", "content": "How can I help you with your learning today?"}
    ]

for msg in st.session_state["chat_messages"]:
    with st.chat_message(msg["role"]):
        st.write(msg["content"])

if prompt := st.chat_input("Ask your AI mentor..."):
    st.session_state["chat_messages"].append({"role": "user", "content": prompt})
    # TODO: Send prompt to backend API and get response
    response = "This is a placeholder response from the AI mentor."
    st.session_state["chat_messages"].append({"role": "assistant", "content": response})
    st.experimental_rerun()
