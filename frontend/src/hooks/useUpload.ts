/**
 * Hook for managing file uploads to the backend.
 */
import { useState, useCallback } from 'react';
import type { ImageFile, UploadResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

interface UseUploadReturn {
  files: ImageFile[];
  addFiles: (newFiles: File[]) => void;
  removeFile: (id: string) => void;
  reorderFiles: (fromIndex: number, toIndex: number) => void;
  upload: () => Promise<UploadResponse | null>;
  uploadProgress: number;
  isUploading: boolean;
  jobId: string | null;
  error: string | null;
}

export function useUpload(): UseUploadReturn {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
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
    const labels = ['Front', 'Back', 'Left', 'Right', 'Top', 'Diagonal 1', 'Diagonal 2', 'Diagonal 3'];
    return {
      id: `img-${Date.now()}-${index}`,
      file,
      thumbnail,
      filename: file.name,
      size: file.size,
      label: labels[index] || `View ${index + 1}`,
    };
  }, [generateThumbnail]);

  const addFiles = useCallback(async (newFiles: File[]) => {
    const currentCount = files.length;
    const remainingSlots = 30 - currentCount;
    
    if (remainingSlots <= 0) return;
    
    const filesToAdd = newFiles.slice(0, remainingSlots);
    const newImageFiles = await Promise.all(
      filesToAdd.map((file, i) => createImageFile(file, currentCount + i))
    );
    
    setFiles((prev) => [...prev, ...newImageFiles]);
  }, [files.length, createImageFile]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const reorderFiles = useCallback((fromIndex: number, toIndex: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      const [removed] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, removed);
      return newFiles;
    });
  }, []);

  const upload = useCallback(async (): Promise<UploadResponse | null> => {
    if (files.length < 6) {
      setError('At least 6 images required');
      return null;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      files.forEach((img) => formData.append('images', img.file));

      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<UploadResponse>((resolve, reject) => {
        xhr.open('POST', `${API_BASE}/api/upload`);
        xhr.setRequestHeader('Accept', 'application/json');
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } else {
            try {
              const parsed = JSON.parse(xhr.responseText || '{}');
              reject(new Error(parsed?.detail || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      const response = await uploadPromise;
      setJobId(response.job_id);
      setUploadProgress(100);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [files]);

  return {
    files,
    addFiles,
    removeFile,
    reorderFiles,
    upload,
    uploadProgress,
    isUploading,
    jobId,
    error,
  };
}
