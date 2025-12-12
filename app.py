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

# Custom CSS for colorful design
st.markdown("""
    <style>
    .main {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .stButton>button {
        background: linear-gradient(90deg, #FF6B6B 0%, #FFE66D 100%);
        color: white;
        font-size: 20px;
        font-weight: bold;
        padding: 15px 30px;
        border-radius: 25px;
        border: none;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
    }
    .stButton>button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.3);
    }
    .title {
        text-align: center;
        color: white;
        font-size: 48px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        margin-bottom: 10px;
    }
    .subtitle {
        text-align: center;
        color: #FFE66D;
        font-size: 18px;
        margin-bottom: 30px;
    }
    .real-news {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        padding: 30px;
        border-radius: 20px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: slideIn 0.5s ease;
    }
    .fake-news {
        background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
        padding: 30px;
        border-radius: 20px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: slideIn 0.5s ease;
    }
    .result-text {
        color: white;
        font-size: 36px;
        font-weight: bold;
        margin: 0;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .confidence {
        color: white;
        font-size: 18px;
        margin-top: 10px;
        opacity: 0.9;
    }
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .stTextArea textarea {
        border-radius: 15px;
        border: 3px solid #FFE66D;
        font-size: 16px;
    }
    </style>
""", unsafe_allow_html=True)

# Load model
@st.cache_resource
def load_resources():
    try:
        model = load_model('fake_vs_real_news_model.keras')
        return model
    except Exception as e:
        st.error(f"Error loading model: {e}")
        return None

# Prediction function
def predict_news(text, model, vocab_size=10000, max_length=700):
    """
    Predict if news is fake or real
    Label encoding: 0=FAKE, 1=REAL
    vocab_size=10000 - matches one_hot(str(text), 10000)
    max_length=700 - matches pad_sequences(encode, maxlen=700, padding="post")
    """
    # Encode text using one_hot (exactly as in training)
    encoded = one_hot(str(text), vocab_size)
    
    # Pad sequence with POST padding and maxlen=700 (exactly as in training)
    padded = pad_sequences([encoded], maxlen=max_length, padding='post')
    
    # Predict - returns probability between 0 and 1
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
                
                # Label encoding: 0=FAKE, 1=REAL
                # So if prediction >= 0.5, it's closer to 1 (REAL)
                # If prediction < 0.5, it's closer to 0 (FAKE)
                
                st.markdown("<br>", unsafe_allow_html=True)
                
                if prediction >= 0.5:  # Closer to 1 = REAL NEWS
                    confidence = prediction * 100
                    st.markdown(f"""
                        <div class="real-news">
                            <p class="result-text">✅ REAL NEWS</p>
                            <p class="confidence">Confidence: {confidence:.1f}%</p>
                        </div>
                    """, unsafe_allow_html=True)
                else:  # Closer to 0 = FAKE NEWS
                    confidence = (1 - prediction) * 100
                    st.markdown(f"""
                        <div class="fake-news">
                            <p class="result-text">❌ FAKE NEWS</p>
                            <p class="confidence">Confidence: {confidence:.1f}%</p>
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
