# 🎓 AI-Powered Personalized Learning Platform

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)](https://fastapi.tiangolo.com)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.28.1-red.svg)](https://streamlit.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An intelligent, AI-powered learning platform that creates personalized educational roadmaps, adapts content to individual learning styles, and provides 24/7 AI mentorship for optimal learning outcomes.

---

## 🌟 Features

### Core Functionality
- **🧠 AI-Generated Roadmaps**: Custom learning paths tailored to your background, skills, and career goals
- **📚 Adaptive Learning**: Content difficulty adjusts in real-time based on performance
- **💬 AI Mentor Chat**: 24/7 Socratic learning assistant powered by GPT-4/Claude
- **📊 Progress Analytics**: Comprehensive dashboards with visual progress tracking
- **🔄 Spaced Repetition**: Smart review scheduling using FSRS algorithm
- **🎯 Interactive Modules**: Multi-format content (text, video, code, diagrams)
- **🏆 Gamification**: Badges, streaks, and achievements to boost motivation
- **💻 Code Playground**: In-browser coding environment with instant feedback

### Smart Features
- Gap analysis between current skills and target role
- Context-aware AI responses based on learning position
- Real-world job market integration (salary insights, job postings)
- Project-based learning with portfolio building
- Anonymized peer benchmarking
- Multi-background support (CS, Engineering, Non-tech)

---

## 🏗️ Project Structure

```
ai_learning_platform/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── routers/           # API endpoints (auth, roadmap, progress, chat)
│   │   ├── models/            # SQLAlchemy database models
│   │   ├── services/          # Business logic & AI integration
│   │   ├── core/              # Security, authentication, utilities
│   │   └── database/          # Database connection & session
│   └── main.py                # FastAPI application entry point
│
├── frontend/                   # Streamlit Frontend
│   ├── pages/                 # Multi-page interface
│   │   ├── 01_Dashboard.py   # Main dashboard
│   │   ├── 02_Roadmap.py     # Learning roadmap view
│   │   ├── 03_Modules.py     # Learning modules
│   │   ├── 04_AI_Mentor.py   # AI chat interface
│   │   └── 05_Analytics.py   # Progress analytics
│   ├── components/            # Reusable UI components
│   │   ├── auth.py           # Login/Register components
│   │   ├── progress_bar.py   # Progress visualizations
│   │   └── module_card.py    # Module display cards
│   └── utils/                 # Helper functions
│       ├── api_client.py     # Backend API calls
│       ├── session.py        # Session management
│       └── validators.py     # Input validation
│
├── config/                     # Configuration files
│   ├── settings.py            # Application settings
│   ├── database_config.py    # Database configuration
│   └── logging_config.py     # Logging setup
│
├── data/                      # Database storage (SQLite/PostgreSQL)
├── logs/                      # Application logs
├── tests/                     # Test files
│   ├── test_auth.py
│   ├── test_roadmap.py
│   └── test_ai_service.py
│
├── .github/workflows/         # CI/CD pipelines
├── requirements.txt           # Python dependencies
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore rules
└── README.md                # This file
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python**: 3.9 or higher
- **pip**: Latest version
- **Git**: For version control
- **OpenAI API Key**: Get from [platform.openai.com](https://platform.openai.com/)
- **PostgreSQL**: (Optional, for production)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/ai-learning-platform.git
cd ai-learning-platform
```

#### 2. Create Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### 3. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 4. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` file:
```env
# Database
DATABASE_URL=sqlite:///./data/ai_learning.db

# Security
SECRET_KEY=your-super-secret-key-generate-random-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Models
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here

# Application
DEBUG=True
API_HOST=0.0.0.0
API_PORT=8000
```

#### 5. Initialize Database
```bash
python -c "from config.database_config import init_database; init_database()"
```

#### 6. Run the Application

**Terminal 1 - Start Backend:**
```bash
cd backend
python main.py
```
✅ Backend running at: `http://localhost:8000`
📚 API Docs: `http://localhost:8000/docs`

**Terminal 2 - Start Frontend:**
```bash
cd frontend
streamlit run app.py
```
✅ Frontend running at: `http://localhost:8501`

---

## 🌐 Deployment to GitHub & Cloud

### Step 1: Push to GitHub

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit: AI Learning Platform"

# Create repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/ai-learning-platform.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy Frontend (Streamlit Cloud)

1. Visit [share.streamlit.io](https://share.streamlit.io)
2. Sign in with GitHub
3. Click **"New app"**
4. Repository: `YOUR_USERNAME/ai-learning-platform`
5. Branch: `main`
6. Main file path: `frontend/app.py`
7. **Advanced Settings** → Add secrets:
   ```toml
   [secrets]
   API_URL = "https://your-backend-url.onrender.com"
   OPENAI_API_KEY = "your-key"
   SECRET_KEY = "your-secret"
   ```
8. Click **Deploy**

### Step 3: Deploy Backend (Render.com)

1. Create account at [render.com](https://render.com)
2. **New +** → **Web Service**
3. Connect GitHub repository
4. Configuration:
   - **Name**: `ai-learning-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables**:
   - `DATABASE_URL`: (Use Render PostgreSQL or keep SQLite)
   - `SECRET_KEY`: Your secret key
   - `OPENAI_API_KEY`: Your OpenAI key
   - `ANTHROPIC_API_KEY`: Your Anthropic key
6. Click **Create Web Service**

### Alternative Deployment Options

**Railway.app**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Heroku**
```bash
heroku create ai-learning-platform
git push heroku main
heroku config:set OPENAI_API_KEY=your-key
```

**Docker**
```bash
docker-compose up -d
```

---

## 🔧 Configuration

### Database Options

**Development (SQLite)**
```env
DATABASE_URL=sqlite:///./data/ai_learning.db
```

**Production (PostgreSQL)**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ai_learning
```

### AI Model Configuration

The platform supports multiple AI providers:

**OpenAI (GPT-4)**
```python
OPENAI_MODEL = "gpt-4"
OPENAI_TEMPERATURE = 0.7
OPENAI_MAX_TOKENS = 2000
```

**Anthropic (Claude)**
```python
ANTHROPIC_MODEL = "claude-3-sonnet-20240229"
```

---

## 📚 API Documentation

Once backend is running, access interactive API docs:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

```
Authentication:
  POST   /api/auth/register      - Create new account
  POST   /api/auth/login         - User login

Roadmap:
  POST   /api/roadmap/generate   - Generate AI roadmap
  GET    /api/roadmap/{user_id}  - Get user roadmap
  PUT    /api/roadmap/{id}       - Update roadmap

Modules:
  GET    /api/module/{id}        - Get module content
  POST   /api/module/complete    - Mark module complete

Progress:
  GET    /api/progress/{user_id} - Get user progress
  POST   /api/progress/update    - Update progress

Chat:
  POST   /api/chat               - Send message to AI mentor

Analytics:
  GET    /api/analytics/{user_id} - Get learning analytics
```

---

## 🧪 Testing

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=backend --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v
```

---

## 🛠️ Development

### Code Quality

```bash
# Format code
black backend/ frontend/

# Lint code
flake8 backend/ frontend/

# Type checking
mypy backend/
```

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## 📊 Technology Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Streamlit 1.28.1 |
| **Backend** | FastAPI 0.104.1 |
| **Database** | SQLite / PostgreSQL |
| **AI Models** | OpenAI GPT-4, Anthropic Claude |
| **Authentication** | JWT (python-jose) |
| **ORM** | SQLAlchemy 2.0.23 |
| **Validation** | Pydantic 2.5.0 |
| **Testing** | pytest 7.4.3 |
| **Logging** | Loguru 0.7.2 |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Coding Standards
- Follow PEP 8 style guide
- Write docstrings for all functions
- Add tests for new features
- Update documentation

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [OpenAI](https://openai.com) - GPT-4 API
- [Anthropic](https://anthropic.com) - Claude API
- [FastAPI](https://fastapi.tiangolo.com) - Modern web framework
- [Streamlit](https://streamlit.io) - Data app framework
- [FSRS](https://github.com/open-spaced-repetition/py-fsrs) - Spaced repetition algorithm

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/ai-learning-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/ai-learning-platform/discussions)
- **Email**: your.email@example.com

---

## 🗺️ Roadmap

- [x] Core platform features
- [x] AI roadmap generation
- [x] Progress tracking
- [ ] Mobile app (React Native)
- [ ] Video content integration
- [ ] Live coding sessions
- [ ] Peer learning communities
- [ ] Certificate generation
- [ ] Integration with GitHub/LinkedIn

---

## 📈 Project Status

**Current Version**: 1.0.0  
**Status**: Active Development  
**Last Updated**: October 2025

---

Made with ❤️ by [Your Name]
