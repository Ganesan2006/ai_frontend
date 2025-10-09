# ai_learning_platform/frontend/utils/api_client.py
import requests

API_URL = "http://localhost:8000/api"

def login(email, password):
    response = requests.post(f"{API_URL}/auth/login", json={"username": email, "password": password})
    return response
