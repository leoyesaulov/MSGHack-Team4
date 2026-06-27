#!/usr/bin/env bash
set -e

# Load environment variables from .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Kill anything still on the ports from a previous run
fuser -k 8000/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true

echo "==> Setting up API venv..."
cd api
# Only create the venv if it doesn't exist yet
if [ ! -f .venv/bin/activate ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install -q -r requirements.txt
cd ..

echo "==> Starting API (port 8000)..."
cd api
# Exclude .venv from watchfiles so installing packages doesn't trigger reloads
.venv/bin/uvicorn src.main:app --reload --reload-exclude '.venv' --host 0.0.0.0 --port 8000 &
API_PID=$!
cd ..

echo "==> Installing frontend dependencies..."
cd app
npm install --legacy-peer-deps --silent
echo "==> Starting frontend dev server (port 5173)..."
npm run dev &
APP_PID=$!
cd ..

echo ""
echo "  CityVoice is running!"
echo "  Frontend : http://localhost:5173"
echo "  API docs : http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop both servers."

trap "kill $API_PID $APP_PID 2>/dev/null; exit 0" INT TERM
wait
