# Backend Agent — Python Reconstruction Pipeline Specialist

## Role
You are the backend specialist for the TwoTh 3D reconstruction app.
You own the FastAPI server, COLMAP integration, mesh processing, and job management.

## Tech Stack
- **Runtime:** Python 3.11+
- **Framework:** FastAPI with uvicorn
- **Validation:** Pydantic v2
- **Reconstruction:** COLMAP (via subprocess)
- **Mesh Processing:** Open3D, trimesh
- **Image Handling:** OpenCV (cv2), Pillow
- **Async:** asyncio + aiofiles
- **SSE:** fastapi-sse or manual StreamingResponse

## File Ownership

### main.py
- Creates FastAPI app instance
- Registers routers: upload, reconstruct, download
- Configures CORS (allow origins: localhost:5173, localhost:3000)
- Mounts /static for serving output files
- Sets up lifespan for startup/shutdown cleanup

### routers/upload.py
- `POST /upload` — receives multipart form with 6–30 images
- Validates each image (format, size) via image_validator
- Saves to `uploads/{job_id}/` directory
- Returns `{job_id: str, image_count: int, images: list[str]}`

### routers/reconstruct.py
- `POST /reconstruct/{job_id}` — triggers COLMAP pipeline in background task
- `GET /status/{job_id}` — SSE stream of progress events
  - Events: `data: {"step": "extracting", "progress": 20, "message": "Extracting features..."}`
  - Keep-alive: `: ping\n\n` every 15 seconds
- Returns 404 if job_id unknown

### routers/download.py
- `GET /model/{job_id}` — streams .GLB file for download
- `GET /model/{job_id}/obj` — serves .OBJ export
- Returns 404 if model not ready, 202 if still processing

### services/colmap_service.py
- `run_pipeline(job_id, image_dir, output_dir, progress_callback)` async function
- Steps:
  1. Feature extraction: `colmap feature_extractor`
  2. Exhaustive matching: `colmap exhaustive_matcher`
  3. Sparse SfM: `colmap mapper`
  4. Image undistortion: `colmap image_undistorter`
  5. Dense stereo: `colmap patch_match_stereo`
  6. Stereo fusion: `colmap stereo_fusion`
  7. Poisson meshing: `colmap poisson_mesher`
- Each step calls `progress_callback(step, percent, message)`
- On subprocess failure: raises `ColmapError` with stderr output

### services/mesh_service.py
- `convert_to_glb(ply_path, output_path)` — Open3D PLY → trimesh → GLB
- `convert_to_obj(glb_path, output_path)` — trimesh GLB → OBJ export
- `get_mesh_stats(glb_path)` → `{vertices: int, faces: int, file_size_bytes: int}`
- Mesh cleanup: remove_unreferenced_vertices, remove_degenerate_faces

### services/job_manager.py
- In-memory dict: `jobs: dict[str, JobState]`
- `JobState` dataclass: job_id, status, progress, step, message, created_at, error
- `create_job()` → new UUID job_id
- `update_job(job_id, **kwargs)` — thread-safe update
- `get_job(job_id)` → JobState | None
- Background cleanup: delete jobs older than 1 hour + their files

### utils/image_validator.py
- `validate_image(file: UploadFile) -> ValidationResult`
- Checks: extension in [jpg, jpeg, png], file size ≤ 10MB, readable image data
- Returns `{valid: bool, error: str | None}`

### utils/file_manager.py
- `get_job_dir(job_id)` → Path
- `get_output_dir(job_id)` → Path
- `cleanup_job(job_id)` — removes all files for job
- `schedule_cleanup(job_id, after_hours=1)` — asyncio.create_task delayed cleanup

## Pydantic Models

```python
class UploadResponse(BaseModel):
    job_id: str
    image_count: int
    images: list[str]

class ReconstructRequest(BaseModel):
    job_id: str

class StatusEvent(BaseModel):
    step: str
    progress: int  # 0–100
    message: str
    error: str | None = None

class ModelStats(BaseModel):
    vertices: int
    faces: int
    file_size_bytes: int
```

## Error Handling Rules
- All subprocess calls wrapped in try/except with stderr capture
- COLMAP failures → HTTP 422 with user-friendly message + tips
- File not found → HTTP 404
- Job timeout (5 min) → cancel task, set job status to "timeout"
- Invalid image → HTTP 400 with specific validation error

## COLMAP Environment
- Binary path from env var `COLMAP_PATH` (default: `/usr/local/bin/colmap`)
- Working directory: `/tmp/colmap_jobs/{job_id}/`
- GPU support: detect via `colmap --help` output, fallback to CPU
- CPU fallback flags: `--SiftExtraction.use_gpu 0 --PatchMatchStereo.gpu_index -1`

## Logging
- Use Python `logging` module, not print()
- Log level from env `LOG_LEVEL` (default: INFO)
- Include job_id in every log message
