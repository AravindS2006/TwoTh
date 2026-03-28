"""
Job Manager - In-memory job tracking and state management.
"""
import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from backend.config import settings
from backend.utils.file_manager import cleanup_job

logger = logging.getLogger(__name__)


@dataclass
class JobState:
    """Represents the current state of a reconstruction job."""
    job_id: str
    status: str = "pending"
    progress: int = 0
    step: str = ""
    message: str = "Waiting..."
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    output_path: Optional[str] = None
    stats: Optional[dict] = None


class JobManager:
    """Manages job states in memory with automatic cleanup."""
    
    def __init__(self):
        self._jobs: dict[str, JobState] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
    
    def create_job(self, job_id: str) -> JobState:
        """Create a new job with pending status."""
        job = JobState(job_id=job_id)
        self._jobs[job_id] = job
        logger.info(f"Created job: {job_id}")
        return job
    
    def get_job(self, job_id: str) -> Optional[JobState]:
        """Get job state by ID."""
        return self._jobs.get(job_id)
    
    def update_job(self, job_id: str, **kwargs) -> Optional[JobState]:
        """Update job state with new values."""
        job = self._jobs.get(job_id)
        if job is None:
            return None
        
        for key, value in kwargs.items():
            if hasattr(job, key):
                setattr(job, key, value)
        
        logger.debug(f"Updated job {job_id}: {kwargs}")
        return job
    
    def start_cleanup_task(self):
        """Start background cleanup of old jobs."""
        if self._cleanup_task is not None:
            return
        
        async def cleanup_loop():
            while True:
                await asyncio.sleep(3600)
                self._cleanup_old_jobs()
        
        self._cleanup_task = asyncio.create_task(cleanup_loop())
        logger.info("Started job cleanup task")
    
    def _cleanup_old_jobs(self):
        """Remove jobs older than cleanup period."""
        import time
        cutoff = time.time() - (settings.cleanup_after_hours * 3600)
        
        to_remove = []
        for job_id, job in self._jobs.items():
            if job.created_at.timestamp() < cutoff:
                to_remove.append(job_id)
        
        for job_id in to_remove:
            cleanup_job(job_id)
            del self._jobs[job_id]
            logger.info(f"Cleaned up old job: {job_id}")


job_manager = JobManager()
