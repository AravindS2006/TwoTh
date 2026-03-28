"""
Upload Router - Handles image uploads for reconstruction.
"""

import logging
import uuid
import hashlib
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from backend.config import settings
from backend.utils.file_manager import get_job_dir
from backend.utils.image_validator import validate_image
from backend.services.job_manager import job_manager

logger = logging.getLogger(__name__)
router = APIRouter()


class UploadResponse(BaseModel):
    """Response model for upload endpoint."""

    job_id: str
    image_count: int
    images: List[str]


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to be safe for filesystem."""
    import re

    sanitized = re.sub(r"[^\w\-.]", "_", filename)
    return sanitized[:100]


def make_unique_filename(filename: str, used_names: set[str], max_len: int = 100) -> str:
    """Create a unique sanitized filename to avoid collisions in a job folder."""
    sanitized = sanitize_filename(filename).strip("._")
    if not sanitized:
        sanitized = "image"

    if "." in sanitized:
        stem, ext = sanitized.rsplit(".", 1)
        ext = f".{ext}"
    else:
        stem, ext = sanitized, ""

    stem = stem or "image"

    counter = 1
    while True:
        suffix = "" if counter == 1 else f"_{counter}"
        allowed_stem_len = max(1, max_len - len(ext) - len(suffix))
        candidate = f"{stem[:allowed_stem_len]}{suffix}{ext}"
        key = candidate.lower()

        if key not in used_names:
            used_names.add(key)
            return candidate

        counter += 1


@router.post("/upload", response_model=UploadResponse)
async def upload_images(images: List[UploadFile] = File(...)):
    """
    Upload 6-30 images for 3D reconstruction.

    Validates each image before saving to a job-specific directory.
    """
    if len(images) < 6:
        raise HTTPException(
            status_code=400, detail="At least 6 images are required for reconstruction"
        )
    if len(images) > settings.max_images:
        raise HTTPException(
            status_code=400, detail=f"Maximum {settings.max_images} images allowed"
        )

    job_id = str(uuid.uuid4())
    job_manager.create_job(job_id)

    job_dir = get_job_dir(job_id)
    job_dir.mkdir(parents=True, exist_ok=True)

    saved_images: List[str] = []
    used_names: set[str] = set()
    seen_hashes: set[str] = set()
    skipped_duplicates = 0
    max_size_bytes = settings.max_file_size_mb * 1024 * 1024

    for image in images:
        validation = validate_image(image, max_size_bytes)

        if not validation["valid"]:
            raise HTTPException(status_code=400, detail=validation["error"])

        safe_filename = make_unique_filename(image.filename, used_names)
        content = await image.read()

        content_hash = hashlib.sha256(content).hexdigest()
        if content_hash in seen_hashes:
            skipped_duplicates += 1
            logger.warning(
                f"Skipped duplicate image content: {image.filename} for job {job_id}"
            )
            continue

        seen_hashes.add(content_hash)

        image_path = job_dir / safe_filename
        with open(image_path, "wb") as f:
            f.write(content)

        saved_images.append(safe_filename)
        logger.info(f"Saved image: {safe_filename} for job {job_id}")

    if len(saved_images) < 6:
        raise HTTPException(
            status_code=400,
            detail=(
                "At least 6 distinct images are required after removing duplicates. "
                f"Received {len(images)} files, but only {len(saved_images)} were unique."
            ),
        )

    logger.info(
        f"Upload complete for job {job_id}: {len(saved_images)} unique images "
        f"(skipped {skipped_duplicates} duplicates)"
    )

    return UploadResponse(
        job_id=job_id, image_count=len(saved_images), images=saved_images
    )
