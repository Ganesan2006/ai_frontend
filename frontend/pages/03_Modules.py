# ai_learning_platform/frontend/pages/03_Modules.py

import streamlit as st

st.title("📚 Learning Modules")
st.write("This is where users can engage with their learning modules.")

st.header("Example Module: Introduction to Python")
st.markdown("""
Welcome to your first module! Here, you'll learn the basics of Python programming.

**Learning Objectives:**
- Understand variables and data types
- Write your first "Hello, World!" program
- Learn about basic operators
""")

st.subheader("Interactive Code Playground")
code = st.text_area("Write your Python code here:", 'print("Hello, World!")')
if st.button("Run Code"):
    try:
        # In a real app, you'd use a sandboxed execution environment
        exec(code)
        st.success("Code executed successfully!")
    except Exception as e:
        st.error(f"An error occurred: {e}")

# TODO: Fetch and display actual module content from the backend
