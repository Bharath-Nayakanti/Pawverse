# PawVerse ML Service

This folder contains the Python AI layer used by PawVerse. It powers image-based species detection, disease classification, and symptom-based health analysis for pets.

## What this service handles

- species prediction for dog/cat images
- disease classification for pet images
- breed-related prediction logic
- symptom-driven health question flows
- AI result endpoints used by the backend API

## Main files

```text
ML/
├── api.py                       # FastAPI service entry point
├── hybrid_symptom_chatbot.py    # symptom analysis workflow
├── predict_species.py           # species classifier
├── predict_disease_unified.py   # unified dog/cat disease prediction
├── predict_full.py              # combined full prediction logic
├── requirements.txt             # Python dependencies
├── models/                      # trained checkpoints and model assets
├── temp/                       # temp output files if generated
├── notebooks/                  # training/research notebooks
├── src/                        # helper modules
├── README.md                   # ML service docs
└── metrics/                    # evaluation reports
```

## Run the ML service

```bash
cd ML
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

The service exposes endpoints such as:

- `/health`
- `/predict/species`
- `/predict/disease`
- `/symptom/start`
- `/symptom/answer`
- `/symptom/results/{session_id}`

## Important deployment note

This service is not meant to be used as a standalone app by itself in production. It is called by the backend through the configured `ML_SERVICE_URL` and is a required AI component of the larger PawVerse platform.

## Typical workflow

1. frontend sends a request to the backend
2. backend validates and authenticates the user
3. backend proxies ML requests to the Python service
4. ML returns prediction results to the backend
5. backend returns a UI-ready response to the frontend

## Model responsibilities

- `predict_species.py` — determines whether a pet image is a dog or a cat
- `predict_disease_unified.py` — classifies disease risk for a pet image
- `predict_full.py` — broader combined inference flow
- `hybrid_symptom_chatbot.py` — symptom-based reasoning and analysis dialog
- `api.py` — public HTTP service layer for the above logic

## Environment and requirements

Use Python 3.10+ and install all dependencies from `requirements.txt` before running the service.

## Disclaimer

The AI outputs are intended for informational support only. They do not replace veterinary guidance. Always consult a licensed veterinarian for accurate diagnosis and treatment decisions.

## Related docs

- [../README.md](../README.md)
- [../backend/README.md](../backend/README.md)
- [../WEB/README.md](../WEB/README.md)
