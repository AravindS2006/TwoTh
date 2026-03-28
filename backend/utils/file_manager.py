"""
File Manager - Handles file system operations for jobs.
"""
import logging
import shutil
from pathlib import Path

from backend.config import settings

logger = logging.getLogger(__name__)


def get_job_dir(job_id: str) -> Path:
    """Get the directory for storing job images."""
    return settings.upload_dir / job_id


def get_output_dir(job_id: str) -> Path:
    """Get the directory for storing job output files."""
    return settings.output_dir / job_id


def ensure_directories() -> None:
    """Ensure upload and output directories exist."""
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.output_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Directories ensured: {settings.upload_dir}, {settings.output_dir}")


def cleanup_job(job_id: str) -> None:
    """
    Remove all files associated with a job.
    
    Args:
        job_id: The job identifier to clean up
    """
    job_dir = get_job_dir(job_id)
    output_dir = get_output_dir(job_id)
    
    if job_dir.exists():
        shutil.rmtree(job_dir)
        logger.info(f"Cleaned up job directory: {job_dir}")
    
    if output_dir.exists():
        shutil.rmtree(output_dir)
        logger.info(f"Cleaned up output directory: {output_dir}")
