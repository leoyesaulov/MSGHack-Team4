# CityVoice - Bürgerbeteiligungsplattform

Civic engagement platform for the city of Ismaning, enabling citizens to submit proposals, gather votes, and submit formal applications to municipal authorities.

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker & Docker Compose (optional)

### Setup

1. **Clone and configure environment:**
```bash
git clone <repository-url>
cd MSGHack-Team4
cp .env.example .env
# Edit .env with your AWS credentials and database settings
```

2. **Run with Docker (recommended):**
```bash
docker compose up --build
```

3. **Or run locally:**
```bash
./dev.sh
```

### Access

- **Frontend:** http://localhost:5173
- **API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### Demo Accounts

- **Citizen:** `stefan_m` / `demo1234`
- **Authority:** `gemeinde_ismaning` / `behoerde2024`

## Environment Variables

All configuration is managed through a single `.env` file in the project root:

```bash
# Database
DATABASE_URL=sqlite:///./cityvoice.db

# PostgreSQL (Docker)
POSTGRES_USER=cityvoice
POSTGRES_PASSWORD=cityvoice2024
POSTGRES_NAME=cityvoice_db

# AWS Bedrock (RAG/AI features)
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_REGION=eu-north-1
```

## Tech Stack

**Backend:**
- FastAPI 0.111.0
- SQLModel 0.0.18 + PostgreSQL with pgvector
- AWS Bedrock (Claude 4.5 Sonnet + Titan Embeddings)
- JWT authentication

**Frontend:**
- React 18.3 + TypeScript
- Vite 5.4
- Zustand (state management)
- Leaflet (maps)

## Architecture

```
MSGHack-Team4/
├── api/              # FastAPI backend
│   ├── src/
│   │   ├── routers/  # API endpoints
│   │   ├── models.py # Database models
│   │   ├── database.py
│   │   ├── rag.py    # RAG/AI logic
│   │   └── main.py
│   └── requirements.txt
├── app/              # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
│   └── package.json
├── .env              # Environment config (single source of truth)
├── docker-compose.yml
└── dev.sh           # Local development script
```

## Key Features

- **Proposal Submission:** Citizens create proposals with location picker
- **RAG-powered Improvement:** AI improves proposal text using similar accepted examples
- **Voting System:** Community votes with configurable thresholds
- **Status Pipeline:** open → submitted → accepted/rejected
- **Authority Inbox:** Dedicated interface for municipal review
- **Map View:** Leaflet-based visualization of proposals

## Database

- **Development:** SQLite (`api/cityvoice.db`)
- **Docker:** PostgreSQL 15 with pgvector extension
- Auto-seeded with demo data on first run

## Development

See [CLAUDE.md](./CLAUDE.md) for detailed architecture and development guidelines.

## License

Proprietary - MSG Hackathon 2026
