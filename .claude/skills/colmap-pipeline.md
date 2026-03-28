# Skill: COLMAP Reconstruction Pipeline

## Overview
Complete step-by-step guide to running COLMAP for Structure-from-Motion (SfM) + Multi-View Stereo (MVS) reconstruction from Python.

---

## What is SfM + MVS? (Simple Explanation)

**Structure from Motion (SfM):**
- Finds matching keypoints (like corners, edges) across multiple photos
- Uses math (epipolar geometry) to figure out where the camera was for each photo
- Builds a "sparse" 3D point cloud — a skeleton of the object

**Multi-View Stereo (MVS):**
- Takes the sparse result + camera positions from SfM
- Computes depth for every pixel in every photo
- Builds a "dense" point cloud — millions of points covering the surface

**Poisson Surface Reconstruction:**
- Converts the dense point cloud into a watertight mesh (triangles)
- The final `.PLY` mesh is what we convert to `.GLB` for the browser

---

## Directory Structure

```
/tmp/colmap_jobs/{job_id}/
├── images/           ← input images (copied here)
├── database.db       ← COLMAP feature database
├── sparse/           ← SfM output (cameras.bin, images.bin, points3D.bin)
│   └── 0/
├── dense/
│   ├── images/       ← undistorted images
│   ├── stereo/       ← depth maps
│   └── fused.ply     ← dense point cloud
└── mesh.ply          ← final Poisson mesh
```

---

## Full Pipeline (Python subprocess)

```python
import subprocess
import os
from pathlib import Path
from typing import Callable

COLMAP = os.getenv("COLMAP_PATH", "/usr/local/bin/colmap")
USE_GPU = os.getenv("COLMAP_USE_GPU", "0")  # "0" for CPU, "1" for GPU

async def run_pipeline(
    job_id: str,
    image_dir: Path,
    output_dir: Path,
    progress_cb: Callable[[str, int, str], None]
) -> Path:
    """
    Run full COLMAP reconstruction pipeline.

    Returns:
        Path to output mesh.ply

    Raises:
        ColmapError: If any COLMAP step fails
    """
    db = output_dir / "database.db"
    sparse = output_dir / "sparse"
    dense = output_dir / "dense"
    sparse.mkdir(parents=True, exist_ok=True)
    dense.mkdir(parents=True, exist_ok=True)

    # Step 1: Feature Extraction
    progress_cb("extracting", 10, "Extracting image features...")
    _run([
        COLMAP, "feature_extractor",
        "--database_path", str(db),
        "--image_path", str(image_dir),
        "--ImageReader.single_camera", "1",
        "--SiftExtraction.use_gpu", USE_GPU,
    ])

    # Step 2: Exhaustive Matching
    progress_cb("matching", 25, "Matching keypoints across images...")
    _run([
        COLMAP, "exhaustive_matcher",
        "--database_path", str(db),
        "--SiftMatching.use_gpu", USE_GPU,
    ])

    # Step 3: Sparse Reconstruction (SfM)
    progress_cb("sparse", 45, "Building sparse 3D model...")
    _run([
        COLMAP, "mapper",
        "--database_path", str(db),
        "--image_path", str(image_dir),
        "--output_path", str(sparse),
    ])

    # Check sparse result exists
    sparse_0 = sparse / "0"
    if not sparse_0.exists():
        raise ColmapError(
            "Sparse reconstruction failed — not enough matched keypoints. "
            "Add more overlapping images or ensure consistent lighting."
        )

    # Step 4: Image Undistortion
    progress_cb("undistort", 55, "Preparing images for dense reconstruction...")
    _run([
        COLMAP, "image_undistorter",
        "--image_path", str(image_dir),
        "--input_path", str(sparse_0),
        "--output_path", str(dense),
        "--output_type", "COLMAP",
    ])

    # Step 5: Dense Stereo (MVS)
    progress_cb("dense", 70, "Running dense reconstruction (this takes a while)...")
    _run([
        COLMAP, "patch_match_stereo",
        "--workspace_path", str(dense),
        "--workspace_format", "COLMAP",
        "--PatchMatchStereo.geom_consistency", "true",
        "--PatchMatchStereo.gpu_index", "-1" if USE_GPU == "0" else "0",
    ])

    # Step 6: Stereo Fusion
    progress_cb("fusion", 82, "Fusing depth maps into point cloud...")
    fused_ply = dense / "fused.ply"
    _run([
        COLMAP, "stereo_fusion",
        "--workspace_path", str(dense),
        "--workspace_format", "COLMAP",
        "--input_type", "geometric",
        "--output_path", str(fused_ply),
    ])

    # Step 7: Poisson Meshing
    progress_cb("meshing", 92, "Generating surface mesh...")
    mesh_ply = output_dir / "mesh.ply"
    _run([
        COLMAP, "poisson_mesher",
        "--input_path", str(fused_ply),
        "--output_path", str(mesh_ply),
    ])

    progress_cb("done", 100, "Reconstruction complete!")
    return mesh_ply


def _run(cmd: list[str]) -> None:
    """Run a COLMAP subprocess, raising ColmapError on failure."""
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=300
    )
    if result.returncode != 0:
        raise ColmapError(f"COLMAP error:\n{result.stderr[-2000:]}")


class ColmapError(Exception):
    """Raised when COLMAP subprocess fails."""
    pass
```

---

## CPU vs GPU Flags

| Flag | GPU value | CPU value |
|---|---|---|
| `SiftExtraction.use_gpu` | `1` | `0` |
| `SiftMatching.use_gpu` | `1` | `0` |
| `PatchMatchStereo.gpu_index` | `0` | `-1` |

**Note:** Dense reconstruction on CPU is VERY slow (10–30 min for 10 images). For a college demo, use GPU Docker with `--gpus all` or accept slow CPU times.

---

## PLY → GLB Conversion (Open3D + trimesh)

```python
import open3d as o3d
import trimesh

def convert_to_glb(ply_path: Path, glb_path: Path) -> None:
    """Convert COLMAP PLY mesh to GLB format for browser rendering."""
    # Load with Open3D for cleanup
    mesh = o3d.io.read_triangle_mesh(str(ply_path))
    mesh.remove_unreferenced_vertices()
    mesh.remove_degenerate_triangles()
    mesh.compute_vertex_normals()

    # Export to OBJ (intermediate format)
    obj_path = ply_path.with_suffix(".obj")
    o3d.io.write_triangle_mesh(str(obj_path), mesh)

    # Convert OBJ → GLB via trimesh
    tm = trimesh.load(str(obj_path))
    tm.export(str(glb_path))
```

---

## Graceful Failure with Tips

If COLMAP sparse step fails, return this error to the user:

```
❌ Reconstruction failed

The 3D reconstruction couldn't find enough matching points between your photos.

Tips for better results:
• Upload at least 8–12 photos (more overlap = better results)
• Capture images in a circle around the object every 15–20°
• Ensure consistent, diffuse lighting (avoid harsh shadows)
• Avoid reflective, transparent, or textureless surfaces
• Keep the object centered and fully visible in each frame
• Don't change zoom level between shots
```

---

## Output Formats

| Format | Use Case | Tool |
|---|---|---|
| `.ply` | Dense point cloud | COLMAP output |
| `.ply` | Triangle mesh | Poisson mesher |
| `.obj` | Intermediate / download | Open3D |
| `.glb` | Browser viewer | trimesh |
