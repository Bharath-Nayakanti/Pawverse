# PawVerse Frontend

This is the React web app for PawVerse. It provides the user-facing experience for pet ownership, health management, AI diagnosis, and community discovery.

## App features

- dashboard and pet overview
- onboarding for new pet owners
- pet records, images, and profile management
- schedule and reminder planning
- vaccination and care tracking
- AI health analysis for pet photos
- nearby pet owner discovery and local recommendations
- community Q&A, messages, groups, and meetups
- lost-pet alerts and social safety tools

## Main structure

```text
WEB/
├── src/             # React app source
├── public/          # static assets
├── package.json     # frontend dependencies and scripts
├── vite.config.js   # Vite config
├── index.html       # entry document
├── README.md
└── dist/            # production build output
```

## Run locally

Install the dependencies:

```bash
cd WEB
npm install
```

Start the app in dev mode:

```bash
cd WEB
npm run dev
```

The frontend will typically run on:

- http://localhost:5173

## Required environment variables

If your backend is not on the default local host, set the frontend API base URL. Example:

```env
VITE_API_BASE_URL=http://localhost:8001
```

The app reads the backend base URL from either `VITE_API_BASE_URL` or `VITE_API_URL`.

## Build for production

```bash
cd WEB
npm run build
```

The production bundle is output into the `dist/` folder.

## Relationship to the rest of the product

- frontend talks to the Node backend for user and platform features
- backend forwards AI image analysis to the Python ML service
- app experience is consistent across care, diagnosis, scheduling, and social features

## Notes

This is not a simple single-page demo. It is the main user interface for a full pet management platform with AI-powered health support.

## Related docs

- [../README.md](../README.md)
- [../backend/README.md](../backend/README.md)
- [../ML/README.md](../ML/README.md)
