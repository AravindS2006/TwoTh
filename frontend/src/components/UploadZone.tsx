/**
 * UploadZone — Drag-and-drop zone with click-to-browse, camera capture,
 * and full mobile responsiveness.
 *
 * On mobile/tablet the component shows three distinct action buttons:
 *   1. Browse Files  — standard file-picker (all images in gallery)
 *   2. Take Photo    — opens camera directly via `capture="environment"`
 *   3. (desktop)     — full drag-and-drop surface as usual
 */
import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  fileCount: number;
}

const MAX_FILES = 30;
const ACCEPTED = 'image/jpeg,image/png';

/** Detect a coarse-grained touch/mobile environment */
function isMobileDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

export default function UploadZone({ onFilesSelected, disabled, fileCount }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const browseRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const isFull = fileCount >= MAX_FILES;
  const isBlocked = disabled || isFull;

  /* ── file helpers ── */
  const filterAndEmit = useCallback(
    (rawFiles: FileList | null) => {
      if (!rawFiles || isBlocked) return;
      const valid = Array.from(rawFiles).filter(
        (f) => f.type === 'image/jpeg' || f.type === 'image/png',
      );
      if (valid.length > 0) onFilesSelected(valid);
    },
    [isBlocked, onFilesSelected],
  );

  /* ── drag-and-drop handlers ── */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      filterAndEmit(e.dataTransfer.files);
    },
    [filterAndEmit],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isBlocked) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  /* ── click handlers ── */
  const openBrowse = () => {
    if (!isBlocked) browseRef.current?.click();
  };

  const openCamera = () => {
    if (!isBlocked) cameraRef.current?.click();
  };

  const onBrowseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    filterAndEmit(e.target.files);
    e.target.value = '';
  };

  const onCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    filterAndEmit(e.target.files);
    e.target.value = '';
  };

  /* ── derived UI state ── */
  const mobile = isMobileDevice();
  const remaining = MAX_FILES - fileCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Hidden file inputs */}
      <input
        ref={browseRef}
        type="file"
        multiple
        accept={ACCEPTED}
        onChange={onBrowseChange}
        className="hidden"
        aria-hidden="true"
      />
      {/* Camera input — capture="environment" opens rear camera on mobile */}
      <input
        ref={cameraRef}
        type="file"
        multiple
        accept={ACCEPTED}
        capture="environment"
        onChange={onCameraChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* ── Main drop surface (desktop-first) ── */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center
          transition-all duration-300 ease-out select-none
          ${isBlocked
            ? 'border-white/10 opacity-50 cursor-not-allowed'
            : isDragging
              ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_40px_rgba(34,211,238,0.25)] scale-[1.015]'
              : 'border-white/20 hover:border-indigo-400 hover:bg-indigo-400/5'
          }
        `}
      >
        <div className="flex flex-col items-center gap-5">
          {/* Icon */}
          <div
            className={`p-4 rounded-full bg-white/5 transition-all duration-300
              ${isDragging ? 'animate-pulse scale-110' : ''}`}
          >
            <svg
              className={`w-10 h-10 sm:w-12 sm:h-12 transition-colors duration-300
                ${isDragging ? 'text-cyan-400' : 'text-white/40'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Primary label */}
          <div>
            <p className="text-base sm:text-lg font-semibold text-white/90">
              {isFull
                ? 'Maximum images reached'
                : isDragging
                  ? 'Drop images here!'
                  : mobile
                    ? 'Add photos of your object'
                    : 'Drag & drop images here'}
            </p>
            {!isBlocked && (
              <p className="text-xs sm:text-sm text-white/50 mt-1">
                {fileCount === 0
                  ? 'Need at least 6 photos from different angles'
                  : `${fileCount} / ${MAX_FILES} images added — need ${Math.max(0, 6 - fileCount)} more`}
              </p>
            )}
          </div>

          {/* Format badges */}
          <div className="flex gap-2 flex-wrap justify-center">
            {['JPG', 'PNG', 'Max 10 MB each'].map((label) => (
              <span
                key={label}
                className="px-3 py-1 text-xs rounded-full bg-white/10 text-white/60"
              >
                {label}
              </span>
            ))}
          </div>

          {/* ── Action buttons ── */}
          {!isBlocked && (
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mt-1">
              {/* Browse files */}
              <button
                type="button"
                onClick={openBrowse}
                className="flex-1 flex items-center justify-center gap-2
                  px-5 py-3 rounded-xl font-medium text-sm
                  bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/40
                  text-indigo-300 hover:text-indigo-200
                  transition-all duration-200 active:scale-95"
                aria-label="Browse image files"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 7h18M3 12h18M3 17h18" />
                </svg>
                Browse Files
              </button>

              {/* Take photo — prominent on mobile */}
              <button
                type="button"
                onClick={openCamera}
                className="flex-1 flex items-center justify-center gap-2
                  px-5 py-3 rounded-xl font-medium text-sm
                  bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40
                  text-cyan-300 hover:text-cyan-200
                  transition-all duration-200 active:scale-95"
                aria-label="Open camera to take a photo"
              >
                {/* Camera icon */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take Photo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile tip */}
      {!isBlocked && mobile && fileCount === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-white/35 mt-3 px-4"
        >
          💡 Tip: Walk around your object in a circle, snapping a photo every 15–20°
        </motion.p>
      )}
    </motion.div>
  );
}
