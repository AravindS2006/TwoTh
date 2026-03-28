# TwoTh — Multi-View 3D Object Reconstruction Web App
## Project Memory for Claude Code Sessions

---

## 🏗️ Architecture Overview

```
Browser (React/Three.js)
        │  HTTP / SSE
        ▼
FastAPI Backend (Python 3.11)
        │  subprocess
        ▼
COLMAP (SfM + MVS pipeline)
        │  .PLY / .OBJ
        ▼
Open3D / trimesh  →  .GLB output
```

### Data Flow
1. User uploads 6–30 images via drag-drop UI
2. Frontend POSTs images to `POST /upload` → receives `job_id`
3. Frontend POSTs to `POST /reconstruct/{job_id}` to start pipeline
4. Frontend subscribes to `GET /status/{job_id}` (SSE) for real-time progress
5. On 100%, frontend loads the `.GLB` from `GET /model/{job_id}`
6. Three.js (React Three Fiber) renders interactive 3D model

---

## 📁 Directory Structure

```
TwoTh/
├── .claude/
│   ├── CLAUDE.md              ← YOU ARE HERE
│   ├── agents/
│   │   ├── frontend-agent.md
│   │   ├── backend-agent.md
│   │   └── devops-agent.md
│   ├── hooks/
│   │   ├── pre-task.md
│   │   ├── post-task.md
│   │   └── code-review.md
│   └── skills/
│       ├── threejs-3d-viewer.md
│       ├── colmap-pipeline.md
│       └── file-upload-ux.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadZone.tsx
│   │   │   ├── ImagePreviewGrid.tsx
│   │   │   ├── ReconstructionStatus.tsx
│   │   │   ├── ModelViewer3D.tsx
│   │   │   ├── ViewerControls.tsx
│   │   │   └── ResultsPanel.tsx
│   │   ├── hooks/
│   │   │   ├── useUpload.ts
│   │   │   ├── useReconstruction.ts
│   │   │   └── useModelLoader.ts
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   └── ResultPage.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── App.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── main.py
│   ├── routers/
│   │   ├── upload.py
│   │   ├── reconstruct.py
│   │   └── download.py
│   ├── services/
│   │   ├── colmap_service.py
│   │   ├── mesh_service.py
│   │   └── job_manager.py
│   ├── utils/
│   │   ├── image_validator.py
│   │   └── file_manager.py
│   └── requirements.txt
├── docker-compose.yml
├── Dockerfile.frontend
├── Dockerfile.backend
├── .env.example
└── README.md
```

---

## 🔑 Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| 3D rendering | React Three Fiber + drei | Idiomatic React wrapper for Three.js |
| Reconstruction | COLMAP via subprocess | Industry standard SfM/MVS, free |
| Mesh export | trimesh → .GLB | GLB is compact, browser-native via Three.js |
| Progress updates | Server-Sent Events (SSE) | Simple one-way streaming, no WS overhead |
| State management | React useState + custom hooks | No Redux complexity needed |
| Styling | Tailwind CSS + Framer Motion | Utility-first + animation library |
| Job tracking | In-memory dict (job_manager) | Sufficient for single-user college demo |
| Containerization | docker-compose | Single command bring-up |

---

## 🌐 API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/upload` | Upload images, returns `{job_id, image_count}` |
| POST | `/reconstruct/{job_id}` | Start COLMAP pipeline for job |
| GET | `/status/{job_id}` | SSE stream of progress events |
| GET | `/model/{job_id}` | Download final `.GLB` model |
| GET | `/health` | Health check |

---

## 🎨 Frontend Routes

| Route | Component | Description |
|---|---|---|
| `/` | HomePage | Upload zone + image preview grid |
| `/result/:jobId` | ResultPage | 3D viewer + download panel |

---

## ⚙️ Environment Variables

```
BACKEND_URL=http://localhost:8000
VITE_API_BASE=http://localhost:8000
COLMAP_PATH=/usr/local/bin/colmap
UPLOAD_DIR=./uploads
OUTPUT_DIR=./outputs
MAX_FILE_SIZE_MB=10
MAX_IMAGES=30
JOB_TIMEOUT_SECONDS=300
CLEANUP_AFTER_HOURS=1
```

---

## 🚫 Conventions & Rules

- **No hardcoded paths** — always use env vars
- **No `console.log`** in production code — use proper logging
- **All async ops** must have loading + error states
- **TypeScript strict mode** — zero `any` types unless unavoidable
- **Every new function** gets JSDoc/docstring
- **Three.js cleanup** — always dispose geometry + material in useEffect cleanup
- **Pydantic validation** on every FastAPI endpoint input
- **CORS** configured for `localhost:5173` in development

---

## 🐛 Known Gotchas

1. COLMAP dense reconstruction requires CUDA GPU for speed; CPU fallback is very slow
2. Images must have sufficient overlap (>70%) for good keypoint matching
3. Three.js GLBLoader needs `draco` decoder for compressed models
4. SSE connections must send `: keep-alive` comments every 15s to avoid proxy timeouts
5. Open3D mesh decimation can reduce vertex count dramatically if needed

---

## 📝 Architecture Change Log

| Date | Change | File(s) Affected |
|---|---|---|
| Initial | Project scaffolded | All |
