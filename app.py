import streamlit as st
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import one_hot

# Page configuration
st.set_page_config(
    page_title="Fake News Detector",
    page_icon="📰",
    layout="centered"
)

# Custom CSS (keep your existing CSS here)
st.markdown("""
    <style>
    /* Your existing CSS styles */
    </style>
""", unsafe_allow_html=True)

# Load model only (no tokenizer needed!)
@st.cache_resource
def load_resources():
    try:
        model = load_model('fake_vs_real_news_model.keras')
        return model
    except Exception as e:
        st.error(f"Error loading model: {e}")
        return None

# Prediction function using one_hot
def predict_news(text, model, vocab_size=10000, max_length=700):
    # Encode text using one_hot (same as training)
    encoded = one_hot(str(text), vocab_size)
    # Pad sequence
    padded = pad_sequences([encoded], maxlen=max_length, padding='post')
    # Predict
    prediction = model.predict(padded, verbose=0)[0][0]
    return prediction

# Header
st.markdown('<p class="title">📰 Fake News Detector</p>', unsafe_allow_html=True)
st.markdown('<p class="subtitle">🔍 Verify the authenticity of news articles using AI</p>', unsafe_allow_html=True)

# Load model
model = load_resources()

if model is not None:
    # Text input
    news_text = st.text_area(
        "Enter the news article or headline:",
        height=200,
        placeholder="Paste your news text here...",
        help="Enter the complete news article or headline you want to verify"
    )
    
    # Predict button
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        predict_button = st.button("🔎 Analyze News", use_container_width=True)
    
    # Prediction
    if predict_button:
        if news_text.strip():
            with st.spinner("🤖 AI is analyzing the news..."):
                prediction = predict_news(news_text, model)
                confidence = prediction if prediction > 0.5 else 1 - prediction
                
                st.markdown("<br>", unsafe_allow_html=True)
                
                if prediction > 0.5:
                    st.markdown(f"""
                        <div class="real-news">
                            <p class="result-text">✅ REAL NEWS</p>
                            <p class="confidence">Confidence: {confidence*100:.1f}%</p>
                        </div>
                    """, unsafe_allow_html=True)
                else:
                    st.markdown(f"""
                        <div class="fake-news">
                            <p class="result-text">❌ FAKE NEWS</p>
                            <p class="confidence">Confidence: {confidence*100:.1f}%</p>
                        </div>
                    """, unsafe_allow_html=True)
        else:
            st.warning("⚠️ Please enter some text to analyze!")
    
    # Footer
    st.markdown("<br><br>", unsafe_allow_html=True)
    st.markdown("""
        <div style='text-align: center; color: white; opacity: 0.7;'>
            <p>💡 Tip: For best results, provide complete sentences or full articles</p>
        </div>
    """, unsafe_allow_html=True)
else:
    st.error("❌ Failed to load the model. Please ensure 'fake_vs_real_news_model.keras' is in the same directory.")
