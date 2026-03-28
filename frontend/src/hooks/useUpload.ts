/**
 * Hook for managing local file staging before sending to Hugging Face Space.
 */
import { useState, useCallback } from 'react';
import type { GenerationRouteState, ImageFile, ViewLabel } from '../types';

const VIEW_LABELS: ViewLabel[] = ['Front', 'Back', 'Left', 'Right', 'Top', 'Bottom'];
const MAX_FILES = VIEW_LABELS.length;
const REQUIRED_FILES = 4;

interface UseUploadReturn {
  files: ImageFile[];
  addFiles: (newFiles: File[]) => void;
  removeFile: (id: string) => void;
  reorderFiles: (fromIndex: number, toIndex: number) => void;
  beginSession: () => GenerationRouteState | null;
  error: string | null;
  clearError: () => void;
}

function relabelFiles(files: ImageFile[]): ImageFile[] {
  return files.map((image, index) => ({
    ...image,
    label: VIEW_LABELS[index] ?? `View ${index + 1}`,
  }));
}

export function useUpload(): UseUploadReturn {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateThumbnail = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }, []);

  const createImageFile = useCallback(async (file: File, index: number): Promise<ImageFile> => {
    const thumbnail = await generateThumbnail(file);
    return {
      id: `img-${Date.now()}-${index}`,
      file,
      thumbnail,
      filename: file.name,
      size: file.size,
      label: VIEW_LABELS[index] ?? `View ${index + 1}`,
    };
  }, [generateThumbnail]);

  const addFiles = useCallback(async (newFiles: File[]) => {
    setError(null);

    const currentCount = files.length;
    const remainingSlots = MAX_FILES - currentCount;
    
    if (remainingSlots <= 0) return;
    
    const filesToAdd = newFiles.slice(0, remainingSlots);
    const newImageFiles = await Promise.all(
      filesToAdd.map((file, i) => createImageFile(file, currentCount + i))
    );
    
    setFiles((prev) => relabelFiles([...prev, ...newImageFiles]));
  }, [files.length, createImageFile]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => relabelFiles(prev.filter((f) => f.id !== id)));
  }, []);

  const reorderFiles = useCallback((fromIndex: number, toIndex: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      const [removed] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, removed);
      return relabelFiles(newFiles);
    });
  }, []);

  const beginSession = useCallback((): GenerationRouteState | null => {
    if (files.length < REQUIRED_FILES) {
      setError('Please provide at least Front, Back, Left, and Right views (4 images minimum).');
      return null;
    }

    return {
      sourceImages: files.map((item) => item.file),
    };
  }, [files]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    files,
    addFiles,
    removeFile,
    reorderFiles,
    beginSession,
    error,
    clearError,
  };
}
