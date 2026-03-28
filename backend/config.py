"""
Configuration settings using pydantic-settings.
"""

import os
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    backend_url: str = Field(default="http://localhost:8000", alias="BACKEND_URL")
    vite_api_base: str = Field(default="http://localhost:8000", alias="VITE_API_BASE")

    colmap_path: str = Field(default="colmap", alias="COLMAP_PATH")
    colmap_use_gpu: str = Field(default="0", alias="COLMAP_USE_GPU")
    simulation_mode: bool = Field(default=False, alias="SIMULATION_MODE")

    upload_dir: Path = Field(default=Path("./uploads"), alias="UPLOAD_DIR")
    output_dir: Path = Field(default=Path("./outputs"), alias="OUTPUT_DIR")

    max_file_size_mb: int = Field(default=10, alias="MAX_FILE_SIZE_MB")
    max_images: int = Field(default=30, alias="MAX_IMAGES")
    job_timeout_seconds: int = Field(default=300, alias="JOB_TIMEOUT_SECONDS")
    cleanup_after_hours: float = Field(default=1.0, alias="CLEANUP_AFTER_HOURS")

    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
