# 📰 Fake vs Real News Detector

An AI-powered web application that uses deep learning to detect whether a news article is fake or real. Built with TensorFlow, Keras, and Streamlit.

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-orange.svg)
![Streamlit](https://img.shields.io/badge/Streamlit-1.x-red.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## 🌟 Features

- **Real-time Prediction**: Instantly analyze news articles for authenticity
- **Deep Learning Model**: Bidirectional LSTM neural network for accurate classification
- **Colorful UI**: Beautiful gradient design with smooth animations
- **Confidence Scores**: Get percentage-based confidence for each prediction
- **Easy to Use**: Simple text input interface

## 🚀 Demo

Try the live demo: [Fake News Detector](https://fake-vs-real-news.streamlit.app/)

## 📊 Model Architecture

The model uses a sophisticated deep learning architecture:

- **Embedding Layer**: 10,000 vocabulary size, 64 dimensions
- **Bidirectional LSTM Layers**: 
  - Layer 1: 240 units with return sequences
  - Layer 2: 320 units with return sequences
  - Layer 3: 120 units with return sequences
  - Layer 4: 60 units
- **Dropout Layers**: 0.3 dropout rate for regularization
- **Output Layer**: Sigmoid activation for binary classification
- **Optimizer**: Adam
- **Loss Function**: Binary Crossentropy

## 📈 Model Performance

- **Training Accuracy**: ~98.7%
- **Validation Accuracy**: ~97.5%
- **Test Accuracy**: ~97.5%

## 🛠️ Installation

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Setup

1. **Clone the repository**
