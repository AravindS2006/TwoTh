/**
 * useModelLoader — Lightweight helper for handling a model URL that is already produced.
 *
 * This hook no longer calls backend APIs. It simply normalizes load state for a provided URL.
 */
import { useState, useEffect, useCallback } from 'react';
import type { ModelStats } from '../types';

interface UseModelLoaderReturn {
  modelUrl: string | null;
  stats: ModelStats | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useModelLoader(jobId: string): UseModelLoaderReturn {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadModel = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    if (!jobId) {
      setModelUrl(null);
      setStats(null);
      setIsLoading(false);
      return;
    }

    setModelUrl(jobId);
    setStats(null);
    setIsLoading(false);
  }, [jobId]);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  return {
    modelUrl,
    stats,
    isLoading,
    error,
    reload: loadModel,
  };
}
