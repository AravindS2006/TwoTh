"""
Mesh Service - Handles mesh conversion and statistics.
Handles both trimesh.Trimesh (single mesh) and trimesh.Scene (multi-mesh GLB/PLY) objects.
"""
import logging
from pathlib import Path

import trimesh
import numpy as np

logger = logging.getLogger(__name__)


def _resolve_mesh(loaded) -> trimesh.Trimesh:
    """
    Resolve a trimesh load result to a single Trimesh object.

    trimesh.load() returns either a Trimesh (single mesh) or a Scene
    (multiple meshes). This helper merges a Scene into one Trimesh so
    callers can always use .vertices / .faces safely.

    Args:
        loaded: Result of trimesh.load() — Trimesh or Scene

    Returns:
        A single trimesh.Trimesh (possibly merged from multiple geometries)
    """
    if isinstance(loaded, trimesh.Trimesh):
        return loaded

    if isinstance(loaded, trimesh.Scene):
        geometries = list(loaded.geometry.values())
        if not geometries:
            # Return empty mesh rather than crashing
            return trimesh.Trimesh()
        if len(geometries) == 1:
            return geometries[0]
        # Merge all scene geometries into one mesh
        return trimesh.util.concatenate(geometries)

    # Fallback: try to return as-is, let caller handle errors
    return loaded


def convert_to_glb(ply_path: Path, glb_path: Path) -> None:
    """
    Convert a COLMAP PLY mesh to GLB format for browser rendering.

    Handles both Scene and Trimesh results from trimesh.load().

    Args:
        ply_path: Path to input PLY file
        glb_path: Path to output GLB file

    Raises:
        Exception: If conversion fails
    """
    logger.info(f"Converting {ply_path} to {glb_path}")
    try:
        loaded = trimesh.load(str(ply_path))
        mesh = _resolve_mesh(loaded)
        mesh.export(str(glb_path))
        logger.info(f"Successfully exported GLB: {glb_path} "
                    f"({len(mesh.vertices):,} vertices, {len(mesh.faces):,} faces)")
    except Exception as e:
        logger.error(f"Failed to convert mesh: {e}")
        raise


def convert_to_obj(glb_path: Path, obj_path: Path) -> None:
    """
    Convert a GLB mesh to OBJ format for download.

    Args:
        glb_path: Path to input GLB file
        obj_path: Path to output OBJ file

    Raises:
        Exception: If conversion fails
    """
    logger.info(f"Converting {glb_path} to OBJ format")
    try:
        loaded = trimesh.load(str(glb_path))
        mesh = _resolve_mesh(loaded)
        mesh.export(str(obj_path))
        logger.info(f"Successfully exported OBJ: {obj_path}")
    except Exception as e:
        logger.error(f"Failed to convert to OBJ: {e}")
        raise


def get_mesh_stats(glb_path: Path) -> dict:
    """
    Get statistics about a GLB mesh file.

    Handles Scene objects returned by trimesh for multi-mesh GLBs.

    Args:
        glb_path: Path to GLB file

    Returns:
        Dictionary with keys: vertices, faces, file_size_bytes, file_size_mb
    """
    loaded = trimesh.load(str(glb_path))
    mesh = _resolve_mesh(loaded)

    vertex_count = len(mesh.vertices) if hasattr(mesh, 'vertices') else 0
    face_count = len(mesh.faces) if hasattr(mesh, 'faces') else 0
    file_size = glb_path.stat().st_size

    return {
        "vertices": int(vertex_count),
        "faces": int(face_count),
        "file_size_bytes": file_size,
        "file_size_mb": round(file_size / (1024 * 1024), 2),
    }
