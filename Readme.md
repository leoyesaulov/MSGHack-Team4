# CityVoice

A digital citizen participation platform that lets residents submit proposals, vote on community ideas, and have accepted requests forwarded to the responsible municipal authority.

---

## Features

- **Proposal submission** — Citizens write ideas in plain language; the platform guides them through the process
- **Community voting** — Proposals need more than 50 votes to advance to the municipal inbox
- **Gemeinde filter** — Users register with their Gemeinde; they only see proposals from their own community
- **Behörden portal** — Authority accounts see only submitted proposals for their Gemeinde, can accept/reject, and download a formal PDF
- **User profile** — Change username, display name, Gemeinde, and password at any time
- **Interactive map** — All proposals shown on a Leaflet map with status markers

## Status flow

```
open  →  (50+ votes)  →  submitted  →  accepted
                                    ↘  rejected
```

---

## Tech stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Routing  | React Router v6 |
| State    | Zustand + localStorage |
| Map      | react-leaflet v4 |
| Backend  | FastAPI + SQLModel |
| Database | PostgreSQL (psycopg2) |
| Auth     | JWT (python-jose) + bcrypt |

---

## Local development

### Prerequisites

- Python 3.12+
- Node.js 20+
- A running PostgreSQL instance (see below)

### Quickstart

```bash
./dev.sh
```

This starts both the API (port 8000) and the Vite dev server (port 5173).

### Database

The API connects to PostgreSQL via the `DATABASE_URL` environment variable:

```
DATABASE_URL=postgresql://dbuser:dbpass@localhost:5432/cityvoice
```

If the variable is not set, it falls back to the Docker container default. Tables and seed data are created automatically on first startup.

**Demo accounts (seeded automatically):**

| Role      | Username            | Password      |
|-----------|---------------------|---------------|
| Citizen   | `stefan_m`          | `demo1234`    |
| Authority | `gemeinde_ismaning` | `behoerde2024`|

---

## Docker

Build and run the API only:

```bash
docker build -t cityvoice-api .
docker run -d -p 8000:8000 \
  -e DATABASE_URL=postgresql://dbuser:dbpass@host:5432/cityvoice \
  cityvoice-api
```

Run the full stack (API + frontend + PostgreSQL):

```bash
docker-compose up
```

Set `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in a `.env` file before running docker-compose.

---

## Project structure

```
MSGHack-Team4/
├── api/                  # FastAPI backend
│   ├── src/
│   │   ├── main.py       # App entrypoint, lifespan, CORS
│   │   ├── models.py     # SQLModel table definitions
│   │   ├── database.py   # Engine + session
│   │   ├── auth.py       # JWT helpers, dependencies
│   │   ├── seed.py       # Demo data seeder
│   │   └── routers/
│   │       ├── auth.py       # /auth/* (register, login, me, PATCH me)
│   │       └── proposals.py  # /proposals/* (CRUD, votes, comments, Behörde inbox)
│   └── requirements.txt
├── app/                  # React frontend
│   └── src/
│       ├── pages/        # One file per route
│       ├── components/   # Shared UI components
│       ├── lib/          # api.ts, authStore.ts, types.ts
│       └── data/         # gemeinden.json (9 587 German Gemeinden)
├── Dockerfile
├── docker-compose.yml
└── dev.sh                # Start both servers locally
```
