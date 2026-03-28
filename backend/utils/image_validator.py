"""
Image Validator - Validates uploaded image files.
"""
import logging
from typing import Dict

from fastapi import UploadFile

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}


def validate_image(image: UploadFile, max_size_bytes: int) -> Dict[str, any]:
    """
    Validate a single uploaded image file.
    
    Args:
        image: FastAPI UploadFile object
        max_size_bytes: Maximum allowed file size in bytes
    
    Returns:
        Dictionary with 'valid' boolean and optional 'error' message
    """
    if not image.filename:
        return {"valid": False, "error": "Empty filename"}
    
    ext = image.filename.lower().split(".")[-1] if "." in image.filename else ""
    
    if ext not in ALLOWED_EXTENSIONS:
        return {
            "valid": False,
            "error": f"Invalid file type '{ext}'. Allowed: JPG, PNG"
        }
    
    if image.content_type not in ALLOWED_MIME_TYPES:
        return {
            "valid": False,
            "error": f"Invalid MIME type '{image.content_type}'. Allowed: image/jpeg, image/png"
        }
    
    try:
        content = image.file.read(max_size_bytes + 1)
        image.file.seek(0)
        
        if len(content) > max_size_bytes:
            size_mb = len(content) / (1024 * 1024)
            max_mb = max_size_bytes / (1024 * 1024)
            return {
                "valid": False,
                "error": f"File '{image.filename}' is {size_mb:.1f}MB (max: {max_mb:.0f}MB)"
            }
            
    except Exception as e:
        logger.error(f"Error validating image {image.filename}: {e}")
        return {
            "valid": False,
            "error": f"Could not read image file: {str(e)}"
        }
    
    return {"valid": True, "error": None}
