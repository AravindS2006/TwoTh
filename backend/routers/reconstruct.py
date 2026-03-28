#!/usr/bin/env python3
"""Reconstruction Router"""

import asyncio
import logging
from pathlib import Path
from typing import Generator
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from backend.services.colmap_service import ColmapError, run_pipeline
from backend.services.job_manager import job_manager
from backend.services.mesh_service import convert_to_glb, get_mesh_stats
from backend.utils.file_manager import get_job_dir, get_output_dir

logger = logging.getLogger(__name__)
router = APIRouter()


class StatusEvent(BaseModel):
    step: str
    progress: int
    message: str
    error: str | None = None


async def reconstruction_task(job_id: str, images_dir: Path):
    output_dir = get_output_dir(job_id)
    output_dir.mkdir(parents=True, exist_ok=True)

    def progress_callback(step, progress, message):
        job_manager.update_job(
            job_id, status="processing", step=step, progress=progress, message=message
        )
        logger.info(f"Job {job_id}: {message} ({progress}%)")

    try:
        mesh_path = await run_pipeline(
            job_id, images_dir, output_dir, progress_callback
        )
        glb_path = output_dir / "model.glb"
        if str(mesh_path).endswith(".glb") and mesh_path != glb_path:
            import shutil

            shutil.copy(mesh_path, glb_path)
        elif str(mesh_path).endswith(".glb") and mesh_path == glb_path:
            pass
        else:
            convert_to_glb(mesh_path, glb_path)
        stats = get_mesh_stats(glb_path)
        job_manager.update_job(
            job_id,
            status="completed",
            progress=100,
            step="done",
            message="Reconstruction complete!",
            output_path=str(glb_path),
            stats=stats,
        )
        logger.info(f"Job {job_id}: Reconstruction completed successfully")
    except ColmapError as e:
        error_msg = str(e)
        logger.error(f"Job {job_id}: COLMAP error - {error_msg}")
        job_manager.update_job(
            job_id, status="error", error=error_msg, message="Reconstruction failed"
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Job {job_id}: Unexpected error - {error_msg}")
        job_manager.update_job(
            job_id, status="error", error=error_msg, message="Reconstruction failed"
        )


@router.post("/reconstruct/{job_id}")
async def start_reconstruction(job_id: str):
    job = job_manager.get_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=404, detail="Job not found. Upload images first."
        )
    if job.status in ["processing", "completed"]:
        raise HTTPException(status_code=400, detail=f"Job is already {job.status}")
    images_dir = get_job_dir(job_id)
    if not images_dir.exists():
        raise HTTPException(
            status_code=404, detail="Images not found. Please re-upload."
        )
    job_manager.update_job(job_id, status="processing", progress=0)
    asyncio.create_task(reconstruction_task(job_id, images_dir))
    return {"message": "Reconstruction started", "job_id": job_id}


@router.get("/status/{job_id}")
async def get_status(job_id: str) -> StreamingResponse:
    job = job_manager.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        last_progress = -1
        while True:
            job = job_manager.get_job(job_id)
            if job is None:
                break
            if job.progress != last_progress:
                event = StatusEvent(
                    step=job.step,
                    progress=job.progress,
                    message=job.message,
                    error=job.error,
                )
                yield "data: " + event.model_dump_json() + "\n\n"
                last_progress = job.progress
            if job.status in ["completed", "error", "cancelled"]:
                break
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
