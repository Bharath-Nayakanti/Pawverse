# PawVerse Backend

This is the main API layer for PawVerse. It handles authentication, pet management, reminders, scheduling, care tracking, community features, and secure forwarding to the ML intelligence service.

## What the backend does

- user authentication and JWT-based access control
- pet profile creation and management
- vaccination, feeding, and reminder workflows
- health records and appointment-related endpoints
- social network and nearby-owner discovery APIs
- Q&A, moderation, and community features
- connectivity to the Python ML service for image and symptom analysis

## Main folders

```text
backend/
├── config/            # database and service config
├── database/          # schema and DB utilities
├── geo/               # location and nearby-owner logic
├── jobs/              # scheduled background jobs
├── middleware/        # auth and request handling
├── models/            # model definitions and data logic
├── routes/            # API route modules
├── schedulers/        # scheduling helpers
├── services/          # business logic and feature services
├── sockets/           # websocket-related features
├── utils/             # validation and helpers
├── validations/       # structured request validation
├── server.js          # main Express app entry point
├── package.json       # package manifest
└── README.md
```

## Core API groups

- `/api/auth` — login, signup, profile access, refresh flow
- `/api/pets` — pet CRUD and pet images
- `/api/schedules` — recurring reminders and schedule templates
- `/api/feeding` — feeding-related workflows
- `/api/vaccines` — vaccine tracking
- `/api/health-records` — medical records and notes
- `/api/appointments` — care appointment APIs
- `/api/insights` — pet insight and recommendation endpoints
- `/api/social` — friend requests, messaging, groups, meetups, lost pets
- `/api/qanda` — pet Q&A and moderation routes
- `/api/ml` — ML proxy routes for species and disease classification

## Environment variables

Create a `.env` file in the backend directory with values such as:

```env
PORT=8001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/pawverse
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000
```

## Run locally

```bash
cd backend
npm install
npm run dev
```

Production mode:

```bash
cd backend
npm start
```

## Database

The backend expects the PostgreSQL schema in:

- `backend/database/schema.sql`

Run it against your local or cloud database before hitting the app.

## Security and app behavior

- JWT authentication for protected routes
- request validation with Joi
- CORS settings for the frontend domain
- rate limiting for abuse prevention
- Express middleware for security and error handling
- ML-service proxying with graceful fallback errors

## Health check

```bash
curl http://localhost:8001/health
```

## Relationship to the rest of the app

- frontend calls the backend for user and app features
- backend calls the ML service for prediction workflows
- PostgreSQL stores users, pets, records, reminders, social connections, and app data

## Notes

This backend is the main application service for PawVerse; it is not just a simple auth server. It is the operational core of the full pet management platform.
