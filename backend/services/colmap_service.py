"""
COLMAP Service - Wrapper for COLMAP reconstruction pipeline.
"""

import asyncio
import logging
import re
import sqlite3
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional
import numpy as np
import open3d as o3d
from backend.config import settings


SIMULATION_MODE = settings.simulation_mode

logger = logging.getLogger(__name__)

COLMAP_PATH = settings.colmap_path
USE_GPU = settings.colmap_use_gpu


def _get_match_stats(db_path: Path) -> dict:
    """Read lightweight feature/match statistics from the COLMAP SQLite database."""
    stats = {
        "images": 0,
        "cameras": 0,
        "keypoints_rows": 0,
        "matches_rows": 0,
        "two_view_geometries_rows": 0,
    }

    if not db_path.exists():
        return stats

    try:
        conn = sqlite3.connect(str(db_path))
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM images")
        stats["images"] = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM cameras")
        stats["cameras"] = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM keypoints")
        stats["keypoints_rows"] = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM matches")
        stats["matches_rows"] = int(cur.fetchone()[0])

        cur.execute("SELECT COUNT(*) FROM two_view_geometries")
        stats["two_view_geometries_rows"] = int(cur.fetchone()[0])

        conn.close()
    except Exception as e:
        logger.warning(f"Could not read COLMAP database stats: {e}")

    return stats


def _mesh_from_sparse_model(sparse_model_dir: Path, output_mesh_path: Path) -> None:
    """Create a CPU-only mesh from COLMAP sparse points via Open3D alpha shape."""
    txt_dir = sparse_model_dir.parent / "sparse_txt"
    txt_dir.mkdir(parents=True, exist_ok=True)

    subprocess.run(
        [
            COLMAP_PATH,
            "model_converter",
            "--input_path",
            str(sparse_model_dir),
            "--output_path",
            str(txt_dir),
            "--output_type",
            "TXT",
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    points_txt = txt_dir / "points3D.txt"
    if not points_txt.exists():
        raise ColmapError("Sparse model conversion failed: points3D.txt was not generated")

    points: list[list[float]] = []
    with points_txt.open("r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            if not line or line.startswith("#"):
                continue
            parts = line.strip().split()
            if len(parts) < 4:
                continue
            try:
                x, y, z = float(parts[1]), float(parts[2]), float(parts[3])
                points.append([x, y, z])
            except ValueError:
                continue

    if len(points) < 4:
        raise ColmapError(
            f"Sparse model has too few points for fallback meshing ({len(points)} points)."
        )

    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(np.asarray(points, dtype=np.float64))
    pcd = pcd.voxel_down_sample(voxel_size=0.01)
    pcd.estimate_normals()

    # For very small sparse models, alpha-shape is unstable; use convex hull first.
    # This ensures low-feature datasets still produce a coarse but valid output mesh.
    if len(points) < 50:
        try:
            mesh, _ = pcd.compute_convex_hull()
            mesh.compute_vertex_normals()
        except Exception:
            # Last-resort tiny placeholder centered at sparse cloud centroid.
            center = np.asarray(pcd.get_center())
            extent = np.asarray(pcd.get_max_bound()) - np.asarray(pcd.get_min_bound())
            radius = float(max(np.linalg.norm(extent), 1e-3) * 0.5)
            mesh = o3d.geometry.TriangleMesh.create_sphere(radius=radius)
            mesh.translate(center)
            mesh.compute_vertex_normals()
    else:
        # Alpha-shape works reasonably on larger sparse SfM point clouds without CUDA.
        mesh = o3d.geometry.TriangleMesh.create_from_point_cloud_alpha_shape(pcd, alpha=0.05)
        mesh.compute_vertex_normals()

    if len(mesh.triangles) == 0:
        raise ColmapError("Sparse fallback meshing produced an empty mesh")

    o3d.io.write_triangle_mesh(str(output_mesh_path), mesh)


class ColmapError(Exception):
    """Raised when COLMAP subprocess fails."""

    pass


@dataclass
class ProgressCallback:
    """Type alias for progress callback function."""

    step: str
    progress: int
    message: str


async def run_pipeline(
    job_id: str,
    image_dir: Path,
    output_dir: Path,
    progress_callback: Callable[[str, int, str], None],
) -> Path:
    """
    Run full COLMAP reconstruction pipeline.

    Args:
        job_id: Unique job identifier
        image_dir: Directory containing input images
        output_dir: Directory for COLMAP output
        progress_callback: Callback for progress updates

    Returns:
        Path to the generated mesh.ply file

    Raises:
        ColmapError: If any COLMAP step fails
    """
    if SIMULATION_MODE:
        return await _run_simulation(job_id, image_dir, output_dir, progress_callback)

    db = output_dir / "database.db"
    sparse = output_dir / "sparse"
    dense = output_dir / "dense"

    sparse.mkdir(parents=True, exist_ok=True)
    dense.mkdir(parents=True, exist_ok=True)

    progress_callback("extracting", 10, "Extracting image features...")
    await _run_colmap(
        [
            COLMAP_PATH,
            "feature_extractor",
            "--database_path",
            str(db),
            "--image_path",
            str(image_dir),
            "--ImageReader.single_camera",
            "0",
            "--SiftExtraction.use_gpu",
            USE_GPU,
            "--SiftExtraction.max_num_features",
            "16384",
            "--SiftExtraction.peak_threshold",
            "0.002",
        ]
    )

    feature_stats = _get_match_stats(db)
    if feature_stats["images"] < 2:
        raise ColmapError(
            "COLMAP indexed fewer than 2 valid images during feature extraction. "
            f"DB stats: images={feature_stats['images']}, cameras={feature_stats['cameras']}, "
            f"keypoints_rows={feature_stats['keypoints_rows']}. "
            "Use standard photo images (JPG/PNG), avoid screenshots/graphics, and ensure files are not corrupted."
        )

    progress_callback("matching", 25, "Matching keypoints across images...")
    await _run_colmap(
        [
            COLMAP_PATH,
            "exhaustive_matcher",
            "--database_path",
            str(db),
            "--SiftMatching.use_gpu",
            USE_GPU,
            "--SiftMatching.guided_matching",
            "1",
        ]
    )

    match_stats = _get_match_stats(db)
    if match_stats["matches_rows"] == 0 and match_stats["two_view_geometries_rows"] == 0:
        logger.warning(
            "No matches found with default matcher settings; retrying with relaxed thresholds."
        )
        await _run_colmap(
            [
                COLMAP_PATH,
                "exhaustive_matcher",
                "--database_path",
                str(db),
                "--SiftMatching.use_gpu",
                USE_GPU,
                "--SiftMatching.guided_matching",
                "1",
                "--SiftMatching.max_ratio",
                "0.95",
                "--SiftMatching.max_distance",
                "0.9",
            ]
        )
        match_stats = _get_match_stats(db)

    if match_stats["matches_rows"] == 0 and match_stats["two_view_geometries_rows"] == 0:
        raise ColmapError(
            "No image matches were found. "
            f"DB stats: images={match_stats['images']}, keypoints_rows={match_stats['keypoints_rows']}, "
            f"matches_rows={match_stats['matches_rows']}, two_view_geometries={match_stats['two_view_geometries_rows']}. "
            "Use 8-12 distinct photos with 60-80% overlap, sharp focus, and consistent lighting."
        )

    progress_callback("sparse", 45, "Building sparse 3D model...")
    await _run_colmap(
        [
            COLMAP_PATH,
            "mapper",
            "--database_path",
            str(db),
            "--image_path",
            str(image_dir),
            "--output_path",
            str(sparse),
            "--Mapper.init_min_num_inliers",
            "40",
            "--Mapper.abs_pose_min_num_inliers",
            "20",
            "--Mapper.min_num_matches",
            "20",
            "--Mapper.ba_local_num_images",
            "10",
        ]
    )

    sparse_0 = sparse / "0"
    if not sparse_0.exists() or not list(sparse_0.glob("*.bin")):
        raise ColmapError(
            "Sparse reconstruction failed — not enough matched keypoints. "
            "Add more overlapping images or ensure consistent lighting. "
            "Tips: Use 8-12 images with good overlap, ensure consistent lighting, "
            "avoid reflective surfaces."
        )

    progress_callback("undistort", 55, "Preparing images for dense reconstruction...")
    await _run_colmap(
        [
            COLMAP_PATH,
            "image_undistorter",
            "--image_path",
            str(image_dir),
            "--input_path",
            str(sparse_0),
            "--output_path",
            str(dense),
            "--output_type",
            "COLMAP",
        ]
    )

    progress_callback(
        "dense", 70, "Running dense reconstruction (this takes a while)..."
    )
    mesh_ply = output_dir / "mesh.ply"
    try:
        await _run_colmap(
            [
                COLMAP_PATH,
                "patch_match_stereo",
                "--workspace_path",
                str(dense),
                "--workspace_format",
                "COLMAP",
                "--PatchMatchStereo.geom_consistency",
                "true",
                "--PatchMatchStereo.gpu_index",
                "-1" if USE_GPU == "0" else "0",
            ]
        )

        progress_callback("fusion", 82, "Fusing depth maps into point cloud...")
        fused_ply = dense / "fused.ply"
        await _run_colmap(
            [
                COLMAP_PATH,
                "stereo_fusion",
                "--workspace_path",
                str(dense),
                "--workspace_format",
                "COLMAP",
                "--input_type",
                "geometric",
                "--output_path",
                str(fused_ply),
            ]
        )

        progress_callback("meshing", 92, "Generating surface mesh...")
        await _run_colmap(
            [
                COLMAP_PATH,
                "poisson_mesher",
                "--input_path",
                str(fused_ply),
                "--output_path",
                str(mesh_ply),
            ]
        )
    except ColmapError as e:
        if "requires CUDA" not in str(e):
            raise

        # CPU-safe fallback for environments without CUDA-enabled dense stereo.
        progress_callback(
            "meshing",
            88,
            "CUDA dense stereo unavailable, falling back to sparse CPU meshing...",
        )
        try:
            await asyncio.to_thread(_mesh_from_sparse_model, sparse_0, mesh_ply)
        except Exception as fallback_err:
            raise ColmapError(
                "Dense reconstruction requires CUDA on this system and sparse fallback meshing failed. "
                f"Fallback error: {fallback_err}"
            )

    progress_callback("done", 100, "Reconstruction complete!")
    return mesh_ply


async def _run_colmap(cmd: list[str], timeout: int = 600) -> None:
    """Run a COLMAP subprocess asynchronously."""
    logger.info(f"Running COLMAP command: {' '.join(cmd[:3])}...")

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)

        if proc.returncode != 0:
            error_msg = stderr.decode("utf-8", errors="ignore")[-2000:]
            logger.error(f"COLMAP failed: {error_msg}")

            # Some distro COLMAP builds expose a smaller option surface.
            # If an option is unsupported, remove it and retry once.
            m = re.search(r"unrecognised option '([^']+)'", error_msg)
            if m:
                bad_opt = m.group(1)
                retry_cmd: list[str] = []
                i = 0
                while i < len(cmd):
                    token = cmd[i]
                    if token == bad_opt:
                        i += 2
                        continue
                    retry_cmd.append(token)
                    i += 1

                if len(retry_cmd) < len(cmd):
                    logger.warning(f"Retrying COLMAP without unsupported option: {bad_opt}")
                    proc2 = await asyncio.create_subprocess_exec(
                        *retry_cmd,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                    )
                    stdout2, stderr2 = await asyncio.wait_for(
                        proc2.communicate(), timeout=timeout
                    )
                    if proc2.returncode == 0:
                        logger.debug(f"COLMAP command completed on compatibility retry: {retry_cmd[1]}")
                        return

                    error_msg = stderr2.decode("utf-8", errors="ignore")[-2000:]
                    logger.error(f"COLMAP retry failed: {error_msg}")

            raise ColmapError(f"COLMAP error: {error_msg}")

        logger.debug(f"COLMAP command completed: {cmd[1]}")

    except asyncio.TimeoutError:
        logger.error(f"COLMAP command timed out after {timeout}s")
        raise ColmapError(f"COLMAP command timed out after {timeout} seconds")
    except FileNotFoundError:
        logger.error(f"COLMAP not found at: {COLMAP_PATH}")
        raise ColmapError(
            f"COLMAP not found. Please install COLMAP and set COLMAP_PATH."
        )


async def _run_simulation(
    job_id: str,
    image_dir: Path,
    output_dir: Path,
    progress_callback: Callable[[str, int, str], None],
) -> Path:
    """Simulate COLMAP pipeline for demonstration purposes."""
    import trimesh

    output_dir.mkdir(parents=True, exist_ok=True)
    glb_path = output_dir / "model.glb"

    steps = [
        ("extracting", 10, "Extracting image features..."),
        ("matching", 25, "Matching keypoints across images..."),
        ("sparse", 45, "Building sparse 3D model..."),
        ("undistort", 55, "Preparing images for dense reconstruction..."),
        ("dense", 70, "Running dense reconstruction..."),
        ("fusion", 82, "Fusing depth maps into point cloud..."),
        ("meshing", 92, "Generating surface mesh..."),
    ]

    for step, progress, message in steps:
        progress_callback(step, progress, message)
        await asyncio.sleep(1.5)

    num_vertices = np.random.randint(2000, 5000)
    num_faces = np.random.randint(1500, 4000)

    vertices = np.random.uniform(-1, 1, (num_vertices, 3))
    faces = np.random.randint(0, num_vertices, (num_faces, 3))

    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
    mesh.export(str(glb_path))

    progress_callback("done", 100, "Reconstruction complete!")
    return glb_path
