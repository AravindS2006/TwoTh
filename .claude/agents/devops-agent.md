# DevOps Agent — Docker & Environment Specialist

## Role
You own containerization, environment configuration, CI setup, and deployment for TwoTh.

## Files Owned
- `docker-compose.yml`
- `Dockerfile.frontend`
- `Dockerfile.backend`
- `.env.example`
- `.env` (never committed)
- `nginx.conf` (if needed)

---

## docker-compose.yml Design

### Services
1. **frontend** — React/Vite app (port 5173 dev / 80 prod)
2. **backend** — FastAPI + uvicorn (port 8000)

### Volumes
- `./backend/uploads:/app/uploads` — persist uploaded images
- `./backend/outputs:/app/outputs` — persist generated models

### Networks
- `twoth-net` internal bridge network

### Environment
- frontend: `VITE_API_BASE=http://localhost:8000`
- backend: reads from `.env` file

### Health Checks
- backend: `GET /health` every 30s

---

## Dockerfile.backend

Base: `python:3.11-slim`

Steps:
1. Install system deps: `libgl1-mesa-glx libglib2.0-0 wget` (for OpenCV)
2. Install COLMAP via apt or build from source (apt: `colmap`)
3. Copy requirements.txt → pip install
4. Copy backend/ → /app
5. Create uploads/ outputs/ directories
6. CMD: `uvicorn main:app --host 0.0.0.0 --port 8000`

COLMAP Note: COLMAP in Docker requires careful handling of GPU passthrough.
For CPU-only (college demo): set `--SiftExtraction.use_gpu 0` in all COLMAP calls.

---

## Dockerfile.frontend

### Development
- Base: `node:20-alpine`
- CMD: `npm run dev -- --host 0.0.0.0`

### Production (multi-stage)
- Stage 1: node:20-alpine → `npm run build` → dist/
- Stage 2: nginx:alpine → copy dist/ → serve on port 80

---

## .env.example

```
# Backend
COLMAP_PATH=/usr/local/bin/colmap
UPLOAD_DIR=./uploads
OUTPUT_DIR=./outputs
MAX_FILE_SIZE_MB=10
MAX_IMAGES=30
JOB_TIMEOUT_SECONDS=300
CLEANUP_AFTER_HOURS=1
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Frontend (Vite prefix required)
VITE_API_BASE=http://localhost:8000
```

---

## Rules
- Never commit `.env` — always commit `.env.example`
- No hardcoded localhost IPs in application code
- All secrets via environment variables
- Docker images should be < 2GB each
- Use `--no-cache-dir` with pip to keep image size down
- Use `.dockerignore` to exclude node_modules, __pycache__, uploads/, outputs/

---

## Local Dev (Without Docker)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## .dockerignore Content
```
node_modules
__pycache__
*.pyc
.env
uploads/
outputs/
dist/
.git
```
