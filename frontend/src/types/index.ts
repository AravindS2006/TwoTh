/**
 * Type definitions for the TwoTh application.
 */

export type ViewLabel = 'Front' | 'Back' | 'Left' | 'Right' | 'Top' | 'Bottom';

export interface ImageFile {
  id: string;
  file: File;
  thumbnail: string;
  filename: string;
  size: number;
  label: string;
}

export interface GenerationRouteState {
  sourceImages: File[];
}

export interface ModelStats {
  vertices: number;
  faces: number;
  file_size_bytes: number;
  file_size_mb: number;
  pbr_channels?: string[];
  paint_pipeline?: string;
}

export type QueueStage = 'pending' | 'generating' | 'complete' | 'error' | 'unknown';

export interface QueueStatus {
  stage: QueueStage;
  rank: number | null;
  queueSize: number | null;
  etaSeconds: number | null;
  progress: number | null;
  message: string | null;
}

export type LightPreset = 'studio' | 'outdoor' | 'dramatic';

export interface ReconstructionSteps {
  queued: { label: string; progress: number };
  shape: { label: string; progress: number };
  paint: { label: string; progress: number };
  optimize: { label: string; progress: number };
  done: { label: string; progress: number };
}

export const STEPS_CONFIG: ReconstructionSteps = {
  queued: { label: 'Waiting for ZeroGPU queue...', progress: 5 },
  shape: { label: 'Generating base mesh with Hunyuan3D-2mv...', progress: 45 },
  paint: { label: 'Applying PBR textures with Hunyuan3D-2.1 Paint...', progress: 80 },
  optimize: { label: 'Optimizing GLB output...', progress: 95 },
  done: { label: 'Complete!', progress: 100 },
};
