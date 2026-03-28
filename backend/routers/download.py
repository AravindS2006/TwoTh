"""
Download Router - Handles model file downloads.
"""
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.config import settings
from backend.services.job_manager import job_manager
from backend.services.mesh_service import convert_to_obj, get_mesh_stats
from backend.utils.file_manager import get_output_dir

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/model/{job_id}")
async def download_model(job_id: str):
    """
    Download the reconstructed 3D model in GLB format.
    """
    job = job_manager.get_job(job_id)
    
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != "completed":
        raise HTTPException(
            status_code=202,
            detail=f"Model is not ready yet. Status: {job.status}"
        )
    
    output_dir = get_output_dir(job_id)
    glb_path = output_dir / "model.glb"
    
    if not glb_path.exists():
        raise HTTPException(status_code=404, detail="Model file not found")
    
    return FileResponse(
        glb_path,
        media_type="application/octet-stream",
        filename=f"model_{job_id}.glb"
    )


@router.get("/model/{job_id}/obj")
async def download_model_obj(job_id: str):
    """
    Download the reconstructed 3D model in OBJ format.
    """
    job = job_manager.get_job(job_id)
    
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != "completed":
        raise HTTPException(
            status_code=202,
            detail=f"Model is not ready yet. Status: {job.status}"
        )
    
    output_dir = get_output_dir(job_id)
    glb_path = output_dir / "model.glb"
    
    if not glb_path.exists():
        raise HTTPException(status_code=404, detail="Model file not found")
    
    obj_path = output_dir / "model.obj"
    if not obj_path.exists():
        convert_to_obj(glb_path, obj_path)
    
    return FileResponse(
        obj_path,
        media_type="application/octet-stream",
        filename=f"model_{job_id}.obj"
    )


@router.get("/stats/{job_id}")
async def get_stats(job_id: str):
    """
    Get statistics about the reconstructed model.
    """
    job = job_manager.get_job(job_id)
    
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != "completed":
        raise HTTPException(
            status_code=202,
            detail=f"Model is not ready yet. Status: {job.status}"
        )
    
    output_dir = get_output_dir(job_id)
    glb_path = output_dir / "model.glb"
    
    if not glb_path.exists():
        raise HTTPException(status_code=404, detail="Model file not found")
    
    stats = get_mesh_stats(glb_path)
    return stats
