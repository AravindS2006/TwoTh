/**
 * useModelLoader — Fetches model stats and constructs the model URL once a job completes.
 *
 * Guards against empty jobId to prevent spurious `/api/stats/` calls
 * (which would 404) when the reconstruction is still in progress.
 */
import { useState, useEffect, useCallback } from 'react';
import type { ModelStats } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

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
    // Guard: never fetch when jobId is empty — avoids /api/stats/ 404
    if (!jobId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/stats/${jobId}`);

      if (response.status === 202) {
        // Model not ready yet — not an error, just not done
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.detail || 'Failed to load model stats');
      }

      const statsData: ModelStats = await response.json();
      setStats(statsData);
      setModelUrl(`${API_BASE}/api/model/${jobId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load model';
      setError(message);
    } finally {
      setIsLoading(false);
    }
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
