# PawVerse

PawVerse is a full pet management and health platform built for pet owners who want more than just AI predictions. It combines pet health tracking, reminders, AI-based diagnosis, nearby pet discovery, social networking, and community-driven care into one application.

## Product overview

PawVerse gives users a place to:

- manage pet profiles and health records
- track vaccines, feeding routines, and care schedules
- monitor reminders and recurring pet care activities
- upload pet images for AI-powered disease and species analysis
- receive symptom- and image-based health insights
- find nearby pet owners, local pet communities, lost-pet alerts, and meetups
- ask questions in a pet Q&A space and interact with a social network

This is not only an ML project. It is a complete pet care and community platform with a strong AI layer embedded into the user experience.

## Core features

### Pet management

- add and update pet profiles
- manage pet images and health records
- monitor key care information for each pet
- store feeding, vaccination, and general care details

### Care planning and reminders

- generate schedule templates for feedings, grooming, vaccines, and preventives
- create recurring reminder occurrences
- complete, skip, snooze, or reschedule care tasks
- track future pet care activities across a time horizon

### AI health analysis

- species detection from pet images
- disease detection using trained ML models
- symptom-based conversational analysis
- hybrid diagnosis workflows combining image and symptom signals

### Social and community features

- nearby pet owner discovery by location and pet filters
- connection requests and messaging
- group creation and meetup planning
- lost pet alerts and community awareness
- safety reporting and user blocking tools
- pet Q&A and community feed functionality

### User experience

- dashboard-based app flow
- profile onboarding
- protected authenticated routes
- app shell with navigation for care, analysis, and social features

## Architecture

```text
React Frontend (Vite)
        │
        ▼
Node.js + Express API
        │
        ├── auth and user management
        ├── pet profiles and records
        ├── feeding, vaccines, schedules, reminders
        ├── health insights and appointments
        ├── Q&A and social/community features
        ├── location-aware nearby pet discovery
        └── ML service proxy
        │
        ▼
Python ML Service (FastAPI)
        │
        ├── species prediction
        ├── disease classification
        ├── breed detection
        └── symptom analysis endpoints
        │
        ▼
PostgreSQL database
```

## Repository structure

```text
Pawverse/
├── backend/                  # Main API and business logic
│   ├── config/
│   ├── database/
│   ├── geo/
│   ├── jobs/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── schedulers/
│   ├── services/
│   ├── sockets/
│   ├── utils/
│   ├── validations/
│   ├── server.js
│   ├── package.json
│   └── README.md
├── ML/                       # AI models and Python prediction code
│   ├── api.py
│   ├── hybrid_symptom_chatbot.py
│   ├── predict_species.py
│   ├── predict_disease_unified.py
│   ├── predict_full.py
│   ├── requirements.txt
│   ├── models/
│   └── README.md
├── WEB/                      # React frontend app
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
├── README.md                 # Project overview
├── .gitignore
└── package.json              # Optional repo-level tooling or scripts
```

## Tech stack

- Frontend: React 19, Vite, React Router, Lucide icons
- Backend: Node.js, Express, PostgreSQL, JWT auth, REST API
- Real-time/social: WebSockets, location-aware community APIs
- AI/ML: Python, FastAPI, PyTorch, TorchVision
- Deployment patterns: Render/AWS-style backend hosting with separate ML service hosting

## Main app modules

The backend covers multiple product areas:

- `auth` for login and user security
- `pets` for pet profiles and records
- `schedules` for triggers, recurring reminders, and schedule generation
- `feeding` for nutrition-related workflows
- `vaccines` for vaccine planning and tracking
- `appointments` and `healthRecords` for care records
- `insights` for pet-care analytics and intelligent recommendations
- `social` for nearby pet owners, connections, groups, meetups, lost pets, safety, and messaging
- `qanda` for pet question answering and moderation
- `uploads` for media handling

## Requirements

Before running locally, install:

- Node.js 18+
- npm
- Python 3.10+
- PostgreSQL
- Git

## Local development

### 1. Clone and install

```bash
git clone <repo-url>
cd Pawverse
```

### 2. Start the backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Example backend environment:

```env
PORT=8001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/pawverse
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000
```

### 3. Start the ML service

```bash
cd ML
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Start the frontend

```bash
cd WEB
npm install
npm run dev
```

Common local ports:

- frontend: http://localhost:5173
- backend: http://localhost:8001
- ML API: http://localhost:8000

## Database setup

The backend expects PostgreSQL tables defined in:

- `backend/database/schema.sql`

Initialize the database for the app before running the backend.

## ML integration

The ML service is an important feature, but only one part of the overall product. It handles:

- species classification
- dog and cat disease classification
- breed prediction
- symptom-based diagnosis and response flows

The main API routes expose analysis features via the backend proxy, including:

- `/health`
- `/api/ml/predict/species`
- `/api/ml/predict/disease`
- `/api/ml/symptom/start`
- `/api/ml/symptom/answer`
- `/api/ml/symptom/results/{session_id}`

## Deployment notes

This project is designed to run in a multi-service deployment model:

- frontend: static hosting or Vite deployment
- backend: Node.js app hosting
- database: PostgreSQL instance
- ML: Python service hosted separately

The backend uses environment variables such as:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `ML_SERVICE_URL`

## Product positioning

PawVerse is a pet care and community platform with AI-powered diagnosis as one of its core capabilities. It is built for:

- pet owners tracking health and routines
- discovery of nearby dog and cat communities
- AI-assisted health checks and recommendations
- pet-care planning and reminders
- local social engagement around pets and lost-pet awareness

## Important disclaimer

PawVerse provides informational guidance and AI-assisted assistance. It is not a substitute for veterinary diagnosis or treatment.

Users should always consult a licensed veterinarian for medical decisions, emergencies, and treatment recommendations.

## Documentation

- [backend/README.md](backend/README.md)
- [ML/README.md](ML/README.md)
- [WEB/README.md](WEB/README.md)

## License

This project is for educational and personal development use unless otherwise specified by the repository owner.

---

PawVerse combines pet management, community connection, and AI-driven health support in one platform.