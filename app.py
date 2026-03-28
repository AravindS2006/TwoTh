# pyright: reportMissingImports=false

"""
TwoTh Hugging Face Space

Chained AI pipeline:
1) tencent/Hunyuan3D-2mv for multiview shape generation.
2) tencent/Hunyuan3D-2.1 Paint for PBR texturing.

Returns a single GLB model and JSON stats.
"""

from __future__ import annotations

import os
import shutil
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

import gradio as gr
import spaces
import torch
import trimesh
from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline

SHAPE_MODEL_ID = os.getenv("SHAPE_MODEL_ID", "tencent/Hunyuan3D-2mv")
SHAPE_SUBFOLDER = os.getenv("SHAPE_SUBFOLDER", "hunyuan3d-dit-v2-mv")
PAINT_MODEL_ID = os.getenv("PAINT_MODEL_ID", "tencent/Hunyuan3D-2.1")

TEMP_ROOT = Path(os.getenv("SPACE_TMP_DIR", "/tmp/twoth-space"))
TEMP_TTL_SECONDS = int(os.getenv("TEMP_TTL_SECONDS", "3600"))
TEMP_ROOT.mkdir(parents=True, exist_ok=True)

_shape_pipeline: Any | None = None
_paint_pipeline: Any | None = None
_paint_pipeline_name = "not_initialized"
_temp_jobs: Dict[str, float] = {}


def _cleanup_temp_jobs() -> None:
    now = time.time()
    stale_dirs: List[str] = []

    for job_dir, created_at in _temp_jobs.items():
        if now - created_at > TEMP_TTL_SECONDS:
            stale_dirs.append(job_dir)

    for stale_dir in stale_dirs:
        shutil.rmtree(stale_dir, ignore_errors=True)
        _temp_jobs.pop(stale_dir, None)


def _register_temp_job(job_dir: Path) -> None:
    _temp_jobs[str(job_dir)] = time.time()


def _load_shape_pipeline() -> Any:
    global _shape_pipeline

    if _shape_pipeline is not None:
        return _shape_pipeline

    try:
        _shape_pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
            SHAPE_MODEL_ID,
            subfolder=SHAPE_SUBFOLDER,
            use_safetensors=True,
            device="cuda",
        )
    except TypeError:
        _shape_pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
            SHAPE_MODEL_ID,
            subfolder=SHAPE_SUBFOLDER,
        )
    except Exception:
        _shape_pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(SHAPE_MODEL_ID)

    return _shape_pipeline


def _load_paint_pipeline() -> Tuple[Any, str]:
    global _paint_pipeline
    global _paint_pipeline_name

    if _paint_pipeline is not None:
        return _paint_pipeline, _paint_pipeline_name

    try:
        from hy3dpaint.textureGenPipeline import Hunyuan3DPaintConfig, Hunyuan3DPaintPipeline

        config = Hunyuan3DPaintConfig(max_num_view=6, resolution=512)
        config.multiview_pretrained_path = PAINT_MODEL_ID
        config.multiview_cfg_path = "hy3dpaint/cfgs/hunyuan-paint-pbr.yaml"
        config.custom_pipeline = "hy3dpaint/hunyuanpaintpbr"

        realesrgan_ckpt = Path("hy3dpaint/ckpt/RealESRGAN_x4plus.pth")
        if realesrgan_ckpt.exists():
            config.realesrgan_ckpt_path = str(realesrgan_ckpt)

        _paint_pipeline = Hunyuan3DPaintPipeline(config)
        _paint_pipeline_name = "hunyuan3d_2_1_paint"
        return _paint_pipeline, _paint_pipeline_name
    except Exception as paint_import_error:
        from hy3dgen.texgen import Hunyuan3DPaintPipeline as LegacyPaintPipeline

        try:
            _paint_pipeline = LegacyPaintPipeline.from_pretrained(PAINT_MODEL_ID)
            _paint_pipeline_name = "hy3dgen_texgen_2_1"
        except Exception:
            _paint_pipeline = LegacyPaintPipeline.from_pretrained("tencent/Hunyuan3D-2")
            _paint_pipeline_name = (
                f"hy3dgen_texgen_2_0_fallback({paint_import_error.__class__.__name__})"
            )

        return _paint_pipeline, _paint_pipeline_name


def _save_uploaded_images(images: Sequence[str], job_dir: Path) -> List[Path]:
    if len(images) < 4 or len(images) > 6:
        raise gr.Error("Provide 4 to 6 orthographic images: Front, Back, Left, Right, optional Top/Bottom.")

    view_names = ["front", "back", "left", "right", "top", "bottom"]
    saved_paths: List[Path] = []

    for index, source in enumerate(images):
        src_path = Path(str(source))
        if not src_path.exists():
            raise gr.Error(f"Input image not found: {src_path}")

        suffix = src_path.suffix.lower() or ".png"
        dst_path = job_dir / f"{view_names[index]}{suffix}"
        shutil.copy2(src_path, dst_path)
        saved_paths.append(dst_path)

    return saved_paths


def _prepare_multiview_inputs(image_paths: Sequence[Path]) -> Dict[str, str]:
    slot_names = ["front", "back", "left", "right", "top", "bottom"]

    return {
        slot_names[index]: str(path)
        for index, path in enumerate(image_paths)
    }


def _extract_mesh(candidate: Any) -> trimesh.Trimesh | None:
    if isinstance(candidate, trimesh.Trimesh):
        return candidate

    if isinstance(candidate, trimesh.Scene):
        meshes = [mesh for mesh in candidate.geometry.values() if isinstance(mesh, trimesh.Trimesh)]
        if not meshes:
            return None
        return trimesh.util.concatenate(meshes)

    if isinstance(candidate, (list, tuple)):
        for value in candidate:
            mesh = _extract_mesh(value)
            if mesh is not None:
                return mesh

    return None


def _run_shape_stage(saved_images: Sequence[Path], output_shape_glb: Path) -> Path:
    shape_pipeline = _load_shape_pipeline()
    multiview_inputs = _prepare_multiview_inputs(saved_images)

    shape_result = shape_pipeline(
        image=multiview_inputs,
        num_inference_steps=30,
        octree_resolution=380,
        num_chunks=20000,
        generator=torch.manual_seed(12345),
        output_type="trimesh",
    )

    shape_mesh = _extract_mesh(shape_result)
    if shape_mesh is None:
        raise RuntimeError("Shape stage did not produce a valid mesh output.")

    shape_mesh.export(output_shape_glb)
    return output_shape_glb


def _to_glb(source_path: Path, output_glb_path: Path) -> Path:
    loaded = trimesh.load(source_path, force="scene")
    loaded.export(output_glb_path, file_type="glb")
    return output_glb_path


def _run_paint_stage(
    input_mesh_path: Path,
    reference_image_path: Path,
    output_glb_path: Path,
) -> Tuple[Path, str]:
    paint_pipeline, paint_pipeline_name = _load_paint_pipeline()

    if paint_pipeline_name.startswith("hunyuan3d_2_1"):
        painted_output = paint_pipeline(
            mesh_path=str(input_mesh_path),
            image_path=str(reference_image_path),
            output_mesh_path=str(output_glb_path),
            use_remesh=False,
            save_glb=True,
        )

        painted_path = Path(str(painted_output)) if painted_output is not None else output_glb_path

        if painted_path.suffix.lower() == ".obj":
            glb_candidate = painted_path.with_suffix(".glb")
            if glb_candidate.exists():
                painted_path = glb_candidate
            else:
                painted_path = _to_glb(painted_path, output_glb_path)
        elif painted_path.suffix.lower() != ".glb":
            painted_path = _to_glb(painted_path, output_glb_path)

        return painted_path, paint_pipeline_name

    shape_mesh = trimesh.load(input_mesh_path, force="mesh")
    painted_mesh = paint_pipeline(shape_mesh, image=str(reference_image_path))

    if isinstance(painted_mesh, (trimesh.Trimesh, trimesh.Scene)):
        painted_mesh.export(output_glb_path)
    elif hasattr(painted_mesh, "export"):
        painted_mesh.export(output_glb_path)
    elif isinstance(painted_mesh, str):
        painted_path = Path(painted_mesh)
        if painted_path.suffix.lower() == ".glb":
            shutil.copy2(painted_path, output_glb_path)
        else:
            _to_glb(painted_path, output_glb_path)
    else:
        raise RuntimeError("Paint stage returned an unsupported output format.")

    return output_glb_path, paint_pipeline_name


def _model_stats(glb_path: Path, paint_pipeline_name: str, view_count: int) -> Dict[str, Any]:
    loaded = trimesh.load(glb_path, force="scene")

    if isinstance(loaded, trimesh.Scene):
        mesh_list = [mesh for mesh in loaded.geometry.values() if isinstance(mesh, trimesh.Trimesh)]
        vertices = int(sum(mesh.vertices.shape[0] for mesh in mesh_list))
        faces = int(sum(mesh.faces.shape[0] for mesh in mesh_list))
    elif isinstance(loaded, trimesh.Trimesh):
        vertices = int(loaded.vertices.shape[0])
        faces = int(loaded.faces.shape[0])
    else:
        vertices = 0
        faces = 0

    file_size_bytes = glb_path.stat().st_size

    return {
        "vertices": vertices,
        "faces": faces,
        "file_size_bytes": file_size_bytes,
        "file_size_mb": round(file_size_bytes / (1024 * 1024), 3),
        "pbr_channels": ["baseColor", "metallicRoughness", "normal"],
        "paint_pipeline": paint_pipeline_name,
        "view_count": view_count,
    }


@spaces.GPU(duration=120)
def generate_3d_pbr(images: List[str]) -> Tuple[str, Dict[str, Any]]:
    _cleanup_temp_jobs()

    job_dir = TEMP_ROOT / f"job-{uuid.uuid4().hex}"
    job_dir.mkdir(parents=True, exist_ok=True)

    try:
        saved_images = _save_uploaded_images(images, job_dir)

        shape_glb = job_dir / "shape_mesh.glb"
        final_glb = job_dir / "model_pbr.glb"

        _run_shape_stage(saved_images, shape_glb)
        painted_glb, paint_pipeline_name = _run_paint_stage(
            shape_glb,
            saved_images[0],
            final_glb,
        )

        if painted_glb != final_glb and painted_glb.exists():
            shutil.copy2(painted_glb, final_glb)

        if not final_glb.exists():
            raise RuntimeError("Final GLB file was not generated.")

        _register_temp_job(job_dir)
        stats = _model_stats(final_glb, paint_pipeline_name, len(saved_images))
        return str(final_glb), stats
    except Exception as exc:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise gr.Error(f"Generation failed: {exc}") from exc


with gr.Blocks(title="TwoTh - Hunyuan3D PBR Generator") as demo:
    gr.Markdown(
        """
        # TwoTh - Serverless 3D PBR Generation
        Upload 4 to 6 orthographic views in this order: Front, Back, Left, Right, optional Top/Bottom.
        The pipeline runs Hunyuan3D-2mv for mesh generation, then Hunyuan3D-2.1 Paint for PBR texturing.
        """
    )

    image_inputs = gr.Files(
        label="Orthographic Images (4-6)",
        file_count="multiple",
        file_types=["image"],
    )

    run_btn = gr.Button("Generate 3D PBR")

    model_output = gr.File(
        label="PBR GLB Output",
        file_types=[".glb"],
    )
    stats_output = gr.JSON(label="Generation Stats")

    run_btn.click(
        fn=generate_3d_pbr,
        inputs=[image_inputs],
        outputs=[model_output, stats_output],
        api_name="generate_3d_pbr",
    )


demo.queue(default_concurrency_limit=1, max_size=16)

if __name__ == "__main__":
    demo.launch()
