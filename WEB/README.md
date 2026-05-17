# Pawverse Pet Health - Web Application

React frontend for the Pawverse Pet Health Assistant, an AI-powered pet health diagnosis tool.

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+ with virtual environment
- ML models trained and available in `ML/models/`

## Running the Application

### 1. Start the FastAPI Backend

From the project root:

```bash
cd ML
source ../venv/bin/activate  # or activate your venv
python api.py
```

The API will run on `http://localhost:8000`

### 2. Start the React Frontend

From the WEB directory:

```bash
cd WEB
npm install  # First time only
npm run dev
```

The frontend will run on `http://localhost:5173`

## Application Structure

- **Home Page**: Landing page with feature overview
- **Health Analysis Page**: Interactive ML-powered pet health diagnosis
  - Species selection (dog/cat)
  - Image upload and analysis
  - Species mismatch detection
  - Symptom questionnaire (8 adaptive questions)
  - Combined diagnosis with confidence scores

## API Endpoints

- `POST /predict/species` - Predict species from image
- `POST /predict/disease` - Predict disease from image
- `POST /symptom/start` - Start symptom checker session
- `POST /symptom/answer` - Submit symptom answer
- `GET /symptom/results/{session_id}` - Get symptom results
- `POST /diagnosis/combine` - Combine image and symptom results

## Building for Production

```bash
cd WEB
npm run build
```

The built files will be in the `dist/` directory.

## Tech Stack

- **Frontend**: React 19, Vite, React Router, Lucide Icons
- **Backend**: FastAPI, PyTorch, TorchVision
- **ML Models**: EfficientNet-B0 for disease and species classification
