# RideConnect

Smart carpooling and ride-sharing platform for university students and daily commuters in the **Nairobi Metropolitan Region**.

[![CI](https://github.com/SolveMMG/SWE3040XA_GROUP_PROJECT/actions/workflows/ci.yml/badge.svg)](https://github.com/SolveMMG/SWE3040XA_GROUP_PROJECT/actions/workflows/ci.yml)
[![Docker Build](https://github.com/SolveMMG/SWE3040XA_GROUP_PROJECT/actions/workflows/docker.yml/badge.svg)](https://github.com/SolveMMG/SWE3040XA_GROUP_PROJECT/actions/workflows/docker.yml)

---

## Overview

RideConnect connects drivers who have empty seats with passengers travelling the same route — cutting transport costs, traffic, and carbon emissions. Drivers post available rides; passengers search, book, and pay via M-Pesa. Both sides rate each other after each trip to build community trust.

---

## Project Structure

```
RideConnect/
├── backend/                  # Node.js + Express REST API
│   ├── src/
│   │   ├── index.js          # Entry point — "Welcome to RideConnect API"
│   │   ├── routes/
│   │   │   ├── health.js     # GET /api/health
│   │   │   ├── rides.js      # GET /api/rides
│   │   │   └── auth.js       # POST /api/auth/register, /login
│   │   └── __tests__/
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── frontend-web/             # React.js + Tailwind CSS
│   ├── src/
│   │   ├── App.js            # Welcome landing page
│   │   └── App.test.js
│   ├── public/
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
│
├── mobile/                   # React Native + Expo
│   ├── App.js                # Welcome screen
│   ├── src/screens/          # Feature screens (to be built out)
│   ├── app.json
│   └── package.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml            # Run tests on every push/PR
│       ├── docker.yml        # Build & push images to GHCR on main
│       └── cd.yml            # Deploy to Render after CI passes
│
├── docker-compose.yml        # Production stack
├── docker-compose.dev.yml    # Development overrides (live reload)
└── .gitignore
```

---

## Core Features

| Feature | Status |
|---|---|
| Route matching (origin → destination) | Planned |
| Real-time GPS tracking | Planned |
| M-Pesa Daraja payment integration | Planned |
| JWT authentication | Scaffold ready |
| Mutual driver/passenger rating | Planned |
| Push notifications | Planned |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native, Expo |
| Web | React.js, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL, Redis, Firebase |
| Auth | JWT, bcrypt |
| Payments | M-Pesa Daraja API |
| Maps | Google Maps API |
| DevOps | Docker, GitHub Actions, Render |

---

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### Run with Docker (recommended)

```bash
# Copy env file and fill in real values
cp backend/.env.example backend/.env

# Start all services (API + Web + PostgreSQL + Redis)
docker compose up --build
```

- Web app: http://localhost:3000
- API: http://localhost:5000
- Health check: http://localhost:5000/api/health

### Run locally (development)

```bash
# Backend
cd backend && npm install && npm run dev

# Web frontend (separate terminal)
cd frontend-web && npm install && npm start

# Mobile (separate terminal)
cd mobile && npm install && npx expo start
```

---

## GitHub Actions Workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Push / PR to `main`, `develop` | Installs deps, runs tests, builds web bundle |
| `docker.yml` | Push to `main` | Builds Docker images, pushes to GHCR |
| `cd.yml` | After CI passes on `main` | Triggers Render deploy hooks |

### Required Secrets (GitHub → Settings → Secrets)

| Secret | Purpose |
|---|---|
| `RENDER_DEPLOY_HOOK_BACKEND` | Render deploy webhook for API |
| `RENDER_DEPLOY_HOOK_WEB` | Render deploy webhook for web frontend |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Welcome message |
| GET | `/api/health` | Service health check |
| GET | `/api/rides` | List available rides |
| GET | `/api/rides/:id` | Single ride detail |
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Authenticate and receive JWT |

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes using conventional commits
4. Push and open a Pull Request against `develop`

---

## License

MIT — see [LICENSE](LICENSE).