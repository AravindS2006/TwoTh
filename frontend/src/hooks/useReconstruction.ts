/**
 * Hook for managing the reconstruction job lifecycle.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { StatusEvent } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

interface UseReconstructionReturn {
  start: () => Promise<void>;
  currentStep: string;
  currentProgress: number;
  message: string;
  isComplete: boolean;
  isProcessing: boolean;
  error: string | null;
}

export function useReconstruction(jobId: string): UseReconstructionReturn {
  const [currentStep, setCurrentStep] = useState('');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const start = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    setCurrentProgress(0);

    try {
      const response = await fetch(`${API_BASE}/api/reconstruct/${jobId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to start reconstruction');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start';
      setError(message);
      setIsProcessing(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;

    const cleanup = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };

    const eventSource = new EventSource(`${API_BASE}/api/status/${jobId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data: StatusEvent = JSON.parse(event.data);
        
        setCurrentStep(data.step);
        setCurrentProgress(data.progress);
        setMessage(data.message);

        if (data.error) {
          setError(data.error);
          setIsProcessing(false);
          cleanup();
        } else if (data.progress >= 100) {
          setIsComplete(true);
          setIsProcessing(false);
          cleanup();
        }
      } catch (e) {
        console.error('Failed to parse status event:', e);
      }
    };

    eventSource.onerror = () => {
      setError('Connection lost');
      setIsProcessing(false);
      cleanup();
    };

    return cleanup;
  }, [jobId]);

  return {
    start,
    currentStep,
    currentProgress,
    message,
    isComplete,
    isProcessing,
    error,
  };
}
