/**
 * Hook for managing the reconstruction job lifecycle.
 */
import { useState, useCallback } from 'react';
import { generate3DPBR } from '../services/hfClient';
import type { ModelStats, QueueStatus } from '../types';

interface UseReconstructionReturn {
  start: () => Promise<void>;
  currentStep: string;
  currentProgress: number;
  message: string;
  isComplete: boolean;
  isProcessing: boolean;
  modelUrl: string | null;
  stats: ModelStats | null;
  queueStatus: QueueStatus | null;
  error: string | null;
}

function toRoundedSeconds(seconds: number | null): number | null {
  if (seconds === null || Number.isNaN(seconds)) {
    return null;
  }

  return Math.max(1, Math.round(seconds));
}

export function useReconstruction(sourceImages: File[]): UseReconstructionReturn {
  const [currentStep, setCurrentStep] = useState('');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    if (sourceImages.length < 4) {
      setError('Please provide at least Front, Back, Left, and Right view images.');
      return;
    }

    setIsProcessing(true);
    setIsComplete(false);
    setModelUrl(null);
    setStats(null);
    setQueueStatus(null);
    setError(null);
    setCurrentStep('queued');
    setMessage('Waiting for a ZeroGPU slot...');
    setCurrentProgress(0);

    try {
      const result = await generate3DPBR({
        images: sourceImages,
        onQueueStatus: (status) => {
          setQueueStatus(status);

          if (status.stage === 'pending') {
            const roundedEta = toRoundedSeconds(status.etaSeconds);
            const queuePosition = status.rank !== null ? `Queue position #${status.rank}` : 'Queued';
            const queueSize = status.queueSize !== null ? ` of ${status.queueSize}` : '';
            const eta = roundedEta !== null ? `, ETA ~${roundedEta}s` : '';

            setCurrentStep('queued');
            setCurrentProgress(8);
            setMessage(`${queuePosition}${queueSize}${eta}`);
            return;
          }

          if (status.stage === 'generating') {
            const normalizedProgress = status.progress ?? 60;

            if (normalizedProgress < 55) {
              setCurrentStep('shape');
            } else if (normalizedProgress < 95) {
              setCurrentStep('paint');
            } else {
              setCurrentStep('optimize');
            }

            setCurrentProgress(Math.max(20, Math.min(normalizedProgress, 98)));
            setMessage(status.message ?? 'Running Hunyuan3D shape and PBR paint pipeline...');
            return;
          }

          if (status.stage === 'complete') {
            setCurrentStep('done');
            setCurrentProgress(100);
            setMessage('PBR generation complete.');
          }

          if (status.stage === 'error') {
            setError(status.message ?? 'Generation failed in Space queue execution.');
          }
        },
      });

      setModelUrl(result.modelUrl);
      setStats(result.stats);
      setCurrentStep('done');
      setCurrentProgress(100);
      setMessage('Your PBR model is ready.');
      setIsComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate model');
    } finally {
      setIsProcessing(false);
    }
  }, [sourceImages]);

  return {
    start,
    currentStep,
    currentProgress,
    message,
    isComplete,
    isProcessing,
    modelUrl,
    stats,
    queueStatus,
    error,
  };
}
