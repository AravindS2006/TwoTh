"""
TwoTh - Multi-View 3D Object Reconstruction Web App
FastAPI Backend Entry Point
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import upload, reconstruct, download
from backend.utils.file_manager import ensure_directories
from backend.config import settings

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown."""
    logger.info("Starting TwoTh Backend...")
    if settings.simulation_mode:
        logger.warning(
            "SIMULATION_MODE is enabled. Reconstruction will generate placeholder meshes instead of using uploaded images."
        )
    ensure_directories()
    logger.info(f"Upload directory: {settings.upload_dir}")
    logger.info(f"Output directory: {settings.output_dir}")
    yield
    logger.info("Shutting down TwoTh Backend...")


app = FastAPI(
    title="TwoTh API",
    version="1.0.0",
    docs_url="/docs",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(reconstruct.router, prefix="/api", tags=["Reconstruction"])
app.include_router(download.router, prefix="/api", tags=["Download"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "TwoTh"}


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "TwoTh API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }
