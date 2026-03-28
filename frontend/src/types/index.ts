/**
 * Type definitions for the TwoTh application.
 */

export interface ImageFile {
  id: string;
  file: File;
  thumbnail: string;
  filename: string;
  size: number;
  label: string;
}

export interface UploadResponse {
  job_id: string;
  image_count: number;
  images: string[];
}

export interface StatusEvent {
  step: string;
  progress: number;
  message: string;
  error?: string;
}

export interface ModelStats {
  vertices: number;
  faces: number;
  file_size_bytes: number;
  file_size_mb: number;
}

export interface JobState {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  step: string;
  message: string;
  error?: string;
  stats?: ModelStats;
}

export type LightPreset = 'studio' | 'outdoor' | 'dramatic';

export interface ReconstructionSteps {
  extracting: { label: string; progress: number };
  matching: { label: string; progress: number };
  sparse: { label: string; progress: number };
  undistort: { label: string; progress: number };
  dense: { label: string; progress: number };
  fusion: { label: string; progress: number };
  meshing: { label: string; progress: number };
  done: { label: string; progress: number };
}

export const STEPS_CONFIG: ReconstructionSteps = {
  extracting: { label: 'Extracting features...', progress: 20 },
  matching: { label: 'Matching keypoints...', progress: 40 },
  sparse: { label: 'Building sparse model...', progress: 60 },
  undistort: { label: 'Undistorting images...', progress: 70 },
  dense: { label: 'Running dense reconstruction...', progress: 80 },
  fusion: { label: 'Fusing point cloud...', progress: 85 },
  meshing: { label: 'Generating mesh...', progress: 90 },
  done: { label: 'Complete!', progress: 100 },
};
