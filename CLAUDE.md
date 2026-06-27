# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CityVoice** is a civic engagement platform (Bürgerbeteiligungsplattform) built for the city of Ismaning. It enables citizens to submit proposals (Bürgerinitiativen), gather community votes, and convert successful proposals into formal applications for municipal authorities (Behörden).

The workflow: Citizens submit ideas → AI provides feedback on feasibility and legal aspects → AI generates a visual poster → Community votes → When threshold (50 votes) is reached, the proposal automatically transitions to "submitted" status → Municipal authority reviews and accepts/rejects.

## Architecture

**Monorepo structure:**
- `api/` - FastAPI backend (Python)
- `app/` - React + TypeScript frontend (Vite)
- Containerized with Docker / Docker Compose
- SQLite database with SQLModel ORM
- JWT authentication with separate user and authority (Behörde) roles

### Backend (FastAPI)

**Entry point:** `api/src/main.py`
- Uses FastAPI with CORS middleware (allow all origins)
- Lifespan event creates DB tables and seeds demo data
- Serves static uploads from `/uploads/` directory
- API endpoints under `/api` prefix

**Database:** `api/src/database.py`
- SQLite at `api/cityvoice.db`
- SQLModel for ORM
- Connection via `get_session()` dependency

**Models:** `api/src/models.py`
- **ProposalStatus enum:** `draft`, `open`, `submitted`, `accepted`, `rejected`
- **Department enum:** Tiefbauamt, Ordnungsamt, Grünflächenamt, Stadtplanungsamt, Schulamt, Umweltamt, Sonstige
- **User:** includes `is_behoerde` flag to distinguish authority accounts
- **Proposal:** core entity with raw/refined descriptions, location (lat/lng), category, department, status, vote threshold (default 50), optional formal_text and image_path
- **Vote:** one per user per proposal
- **Comment:** discussion on proposals

**Routes:**
- `api/src/routers/auth.py` - Registration, login (OAuth2 password flow), `/auth/me`
- `api/src/routers/proposals.py` - CRUD for proposals, voting, comments, image upload
  - `GET /proposals/behoerde/inbox` - special endpoint for authority accounts showing only submitted/accepted/rejected proposals
  - Image upload stores in `api/uploads/` with UUID filename

**Seeding:** `api/src/seed.py`
- Creates 5 named demo users (password: `demo1234`) and 55 extra voters
- Seeds 4 proposals (one per status: open, submitted, accepted, rejected) with Ismaning-specific content
- Demo user: `stefan_m / demo1234`
- Authority account: `gemeinde_ismaning / behoerde2024`

### Frontend (React + Vite)

**Entry point:** `app/src/main.tsx` → `App.tsx`
- React Router for navigation
- Zustand for auth state management (`app/src/lib/authStore.ts`)
- Tailwind-style custom CSS (`app/src/index.css`)

**Routes:**
- `/` - HomePage: list of proposals with filters
- `/map` - MapPage: Leaflet map showing proposal locations
- `/submit` - SubmitPage: create new proposal (citizens only)
- `/proposals/:id` - ProposalDetailPage: view, vote, comment on a proposal
- `/meine-antraege` - MyProposalsPage: user's own proposals (citizens only)
- `/behoerde` - BehoerdePage: authority inbox for submitted proposals (Behörde only)
- `/login`, `/register`, `/about`

**Key Components:**
- `LocationPicker.tsx` - Leaflet map for selecting proposal location
- `Pipeline.tsx` - visual status flow (open → submitted → accepted/rejected)
- `StatusBadge.tsx` - colored badge per proposal status
- `ProgressBar.tsx` - shows votes vs threshold
- `VoteModal.tsx` - voting interface with threshold progress
- `Toast.tsx` - notifications

**API Layer:** `app/src/lib/api.ts`
- Fetches JWT from localStorage (`cityvoice-auth`)
- Automatically includes `Authorization: Bearer <token>` header
- Login uses `application/x-www-form-urlencoded` per OAuth2 spec

**Types:** `app/src/lib/types.ts` mirrors backend models

## Development Commands

### Local Development (Recommended)

```bash
./dev.sh
```
Runs both frontend and backend concurrently:
- Creates Python venv, installs dependencies
- Starts API on `http://localhost:8000` (uvicorn with `--reload`)
- Installs npm deps with `--legacy-peer-deps`
- Starts frontend dev server on `http://localhost:5173`
- API docs available at `http://localhost:8000/docs`

### Docker Compose

```bash
docker compose up --build
```
- API: `http://localhost:8000`
- App: `http://localhost:5173`
- Persistent DB volume: `cityvoice_db`

### Docker (API only)

```bash
docker build -t team4.api .
docker run -d -p 8000:8000 team4.api
```

### Backend Only

```bash
cd api
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Only

```bash
cd app
npm install --legacy-peer-deps
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

## Database

- **Location:** `api/cityvoice.db` (SQLite)
- **Schema:** auto-created on startup via SQLModel metadata
- **Reset:** delete `cityvoice.db` and restart the API to reseed

## Authentication

- JWT tokens stored in localStorage under `cityvoice-auth` key (Zustand persist)
- Two user types:
  - **Citizens:** can submit proposals, vote, comment
  - **Behörde (Authority):** `is_behoerde=true`, can access `/behoerde` inbox and update proposal status/department
- Passwords hashed with bcrypt via passlib

## CI/CD

- **GitHub Actions:** `.github/workflows/main.yml`
- Self-hosted runner on EC2
- On push to `main`: builds Docker image and runs container on port 8000

## Key Business Logic

1. **Proposal Lifecycle:**
   - Created with `status=open` by citizens
   - When votes reach threshold (50), frontend/user can manually update to `submitted`
   - Behörde reviews submitted proposals in `/behoerde` inbox
   - Behörde can assign department and set status to `accepted` or `rejected`

2. **Voting:**
   - One vote per user per proposal
   - Can add/remove vote (toggle)
   - Vote count displayed with progress bar toward threshold

3. **Image Upload:**
   - Proposals can have one image
   - Stored in `api/uploads/` with UUID filename
   - Served via `/uploads/` static mount
   - Allowed types: jpeg, png, webp, gif (max 10MB)

## Tech Stack

**Backend:**
- FastAPI 0.111.0
- SQLModel 0.0.18 (Pydantic + SQLAlchemy)
- Uvicorn (ASGI server)
- python-jose (JWT)
- passlib + bcrypt (password hashing)

**Frontend:**
- React 18.3
- TypeScript 5.6
- Vite 5.4
- React Router 7.18
- Zustand 5.0 (state management)
- Leaflet + React-Leaflet (maps)

**Deployment:**
- Docker + Docker Compose
- Self-hosted GitHub Actions runner on EC2
