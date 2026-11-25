# KisanVision AI

Agentic AI Agricultural Intelligence Platform built for five strictly supported crops:

- Coffee
- Black Pepper
- Ginger
- Cardamom
- Arecanut

## Tech Stack

- **Frontend:** React, Vite, JavaScript, React Router, Axios, Recharts, React Icons (`react-icons/fi`)
- **Backend:** Node.js, Express.js, JavaScript
- **Planned Integrations (Phases 2-7):** MongoDB Atlas, Mongoose, JWT + bcryptjs, Google Gemini API (Agentic Orchestrator), Cloudinary, Real Weather API

## Project Structure

```text
KisanVision/
├── frontend/               # React + Vite client application
├── server/                 # Express REST API & Agentic AI backend
├── .gitignore
├── package.json
└── README.md
```

## Setup (Phase 1)

1. Install dependencies:
   ```bash
   npm run install:all
   ```
2. Copy environment templates:
   - `server/.env.example` -> `server/.env`
   - `frontend/.env.example` -> `frontend/.env`
3. Run development servers:
   ```bash
   npm run dev:server
   npm run dev:frontend
   ```
4. Verify backend health:
   `GET http://localhost:5000/api/health`
