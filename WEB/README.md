# 🌐 PawVerse Web Application

Flask/FastAPI web interface and API for the PawVerse AI Pet Health Assistant.

## Directory Structure

```
WEB/
├── app.py                 # Main web application (Flask/FastAPI)
├── api/                   # API endpoints
├── templates/             # HTML templates
├── static/                # CSS, JavaScript, images
├── config.py              # Configuration
└── requirements.txt       # Dependencies
```

## Setup

1. **Navigate to WEB directory:**
   ```bash
   cd WEB
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Usage

**Start the web server:**
```bash
python app.py
```

Access the application at: `http://localhost:5000` (Flask) or `http://localhost:8000` (FastAPI)

## Features

- 📷 Image upload and analysis
- 🩺 Symptom questionnaire
- 🐾 Pet species detection
- 📊 Combined diagnosis results
- 🔗 API endpoints for integration

## API Endpoints

- `POST /api/predict/disease` - Predict disease from image
- `POST /api/predict/species` - Detect pet species
- `POST /api/symptom/check` - Run symptom analysis
- `POST /api/diagnose` - Combined diagnosis

## Note

The web application uses the ML models from `../ML/`. Ensure ML models are trained before running the web app.

See `../ML/README.md` for details on training models.
