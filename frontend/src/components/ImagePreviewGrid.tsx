/**
 * ImagePreviewGrid — Thumbnail grid with remove button.
 * On mobile the remove button is always visible (no hover needed).
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { ImageFile } from '../types';

interface ImagePreviewGridProps {
  files: ImageFile[];
  onRemove: (id: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImagePreviewGrid({ files, onRemove }: ImagePreviewGridProps) {
  if (files.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-medium text-white/60">
          {files.length} image{files.length !== 1 ? 's' : ''} selected
        </h3>
        {files.length >= 4 && (
          <span className="text-xs text-green-400 font-medium">✓ Required views ready</span>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
        <AnimatePresence mode="popLayout">
          {files.map((image, index) => (
            <motion.div
              key={image.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18 }}
              className="group relative"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10">
                <img
                  src={image.thumbnail}
                  alt={image.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-1.5">
                  <p className="text-[10px] text-white/80 truncate leading-tight">{image.label}</p>
                  <p className="text-[9px] text-white/40">{formatFileSize(image.size)}</p>
                </div>

                {/* Index badge */}
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] rounded-md bg-indigo-500/80 text-white font-medium">
                  {index + 1}
                </span>

                {/* Remove button — always visible on touch, hover on desktop */}
                <button
                  onClick={() => onRemove(image.id)}
                  className="
                    absolute top-1.5 right-1.5
                    w-6 h-6 rounded-full
                    bg-black/60 hover:bg-red-500
                    flex items-center justify-center
                    /* Always show on touch devices, hover-reveal on desktop */
                    opacity-100 sm:opacity-0 sm:group-hover:opacity-100
                    transition-all duration-150
                    touch-manipulation
                  "
                  aria-label={`Remove ${image.filename}`}
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
