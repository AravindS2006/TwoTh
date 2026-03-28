import { Client, handle_file } from '@gradio/client';
import type { ModelStats, QueueStatus, QueueStage } from '../types';

const HF_SPACE_ID = import.meta.env.VITE_HF_SPACE_ID || 'your-hf-username/your-space-name';
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN;

let cachedClientPromise: Promise<Awaited<ReturnType<typeof Client.connect>>> | null = null;

interface Generate3DPbrArgs {
  images: File[];
  onQueueStatus?: (status: QueueStatus) => void;
}

interface Generate3DPbrResult {
  modelUrl: string;
  stats: ModelStats | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function toStringValue(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return null;
}

function normalizeStage(value: string | null): QueueStage {
  if (!value) {
    return 'unknown';
  }

  const normalized = value.toLowerCase();

  if (normalized.includes('pending') || normalized.includes('queue')) {
    return 'pending';
  }

  if (normalized.includes('process') || normalized.includes('generating') || normalized.includes('running')) {
    return 'generating';
  }

  if (normalized.includes('complete') || normalized.includes('finished') || normalized.includes('done')) {
    return 'complete';
  }

  if (normalized.includes('error') || normalized.includes('failed')) {
    return 'error';
  }

  return 'unknown';
}

function normalizeProgress(progressValue: number | null): number | null {
  if (progressValue === null) {
    return null;
  }

  if (progressValue >= 0 && progressValue <= 1) {
    return Math.round(progressValue * 100);
  }

  if (progressValue > 1 && progressValue <= 100) {
    return Math.round(progressValue);
  }

  return null;
}

function getProgressFromStatus(record: Record<string, unknown>): number | null {
  const directProgress = normalizeProgress(toNumber(record.progress));

  if (directProgress !== null) {
    return directProgress;
  }

  const progressData = record.progress_data;

  if (!Array.isArray(progressData) || progressData.length === 0) {
    return null;
  }

  const lastEntry = progressData[progressData.length - 1];

  if (!isRecord(lastEntry)) {
    return null;
  }

  const asProgress = normalizeProgress(toNumber(lastEntry.progress));
  if (asProgress !== null) {
    return asProgress;
  }

  const index = toNumber(lastEntry.index);
  const length = toNumber(lastEntry.length);

  if (index === null || length === null || length <= 0) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round((index / length) * 100)));
}

function normalizeQueueStatus(rawStatus: unknown): QueueStatus {
  if (!isRecord(rawStatus)) {
    return {
      stage: 'unknown',
      rank: null,
      queueSize: null,
      etaSeconds: null,
      progress: null,
      message: null,
    };
  }

  const rawStage = toStringValue(rawStatus.stage) ?? toStringValue(rawStatus.status);

  return {
    stage: normalizeStage(rawStage),
    rank: toNumber(rawStatus.rank) ?? toNumber(rawStatus.position),
    queueSize: toNumber(rawStatus.queue_size) ?? toNumber(rawStatus.size),
    etaSeconds: toNumber(rawStatus.eta),
    progress: getProgressFromStatus(rawStatus),
    message: toStringValue(rawStatus.message),
  };
}

function extractOutputData(rawResult: unknown): unknown[] {
  if (isRecord(rawResult) && Array.isArray(rawResult.data)) {
    return rawResult.data;
  }

  if (Array.isArray(rawResult)) {
    return rawResult;
  }

  return [rawResult];
}

function resolveModelUrl(candidate: unknown): string | null {
  if (typeof candidate === 'string' && candidate.length > 0) {
    return candidate;
  }

  if (!isRecord(candidate)) {
    return null;
  }

  const directUrl = toStringValue(candidate.url);

  if (directUrl) {
    return directUrl;
  }

  const nestedData = candidate.data;

  if (isRecord(nestedData)) {
    return toStringValue(nestedData.url);
  }

  return null;
}

function parseStats(candidate: unknown): ModelStats | null {
  if (!isRecord(candidate)) {
    return null;
  }

  const vertices = toNumber(candidate.vertices);
  const faces = toNumber(candidate.faces);
  const fileSizeBytes = toNumber(candidate.file_size_bytes);
  const fileSizeMb = toNumber(candidate.file_size_mb);

  if (vertices === null || faces === null || fileSizeBytes === null) {
    return null;
  }

  const pbrChannelsRaw = candidate.pbr_channels;
  const pbrChannels = Array.isArray(pbrChannelsRaw)
    ? pbrChannelsRaw.filter((item): item is string => typeof item === 'string')
    : undefined;

  const paintPipeline = toStringValue(candidate.paint_pipeline) ?? undefined;

  return {
    vertices,
    faces,
    file_size_bytes: fileSizeBytes,
    file_size_mb: fileSizeMb ?? Number((fileSizeBytes / (1024 * 1024)).toFixed(3)),
    pbr_channels: pbrChannels,
    paint_pipeline: paintPipeline,
  };
}

async function getClient() {
  if (HF_SPACE_ID.includes('your-hf-username/your-space-name')) {
    throw new Error('Set VITE_HF_SPACE_ID to your Hugging Face Space id, for example: yourname/twoth-hunyuan3d');
  }

  if (!cachedClientPromise) {
    cachedClientPromise = HF_TOKEN
      ? Client.connect(HF_SPACE_ID, { hf_token: HF_TOKEN })
      : Client.connect(HF_SPACE_ID);
  }

  return cachedClientPromise;
}

export async function generate3DPBR({ images, onQueueStatus }: Generate3DPbrArgs): Promise<Generate3DPbrResult> {
  if (images.length < 4 || images.length > 6) {
    throw new Error('Please provide 4 to 6 orthographic images.');
  }

  const app = await getClient();
  const payload = {
    images: images.map((file) => handle_file(file)),
  };

  const submission = app.submit('/generate_3d_pbr', payload);
  let finalPayload: unknown[] | null = null;

  for await (const event of submission) {
    if (!isRecord(event)) {
      continue;
    }

    const eventType = toStringValue(event.type);

    if (eventType === 'status' && onQueueStatus) {
      onQueueStatus(normalizeQueueStatus(event));
      continue;
    }

    if (eventType === 'data' && Array.isArray(event.data)) {
      finalPayload = event.data;
    }
  }

  if (!finalPayload || finalPayload.length === 0) {
    throw new Error('The Space completed but returned no payload data.');
  }

  const outputs = extractOutputData(finalPayload);
  const modelUrl = resolveModelUrl(outputs[0] ?? finalPayload);

  if (!modelUrl) {
    throw new Error('The Space did not return a downloadable GLB URL.');
  }

  return {
    modelUrl,
    stats: parseStats(outputs[1] ?? null),
  };
}
