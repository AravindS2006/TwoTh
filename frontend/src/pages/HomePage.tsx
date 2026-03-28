/**
 * HomePage — Main upload interface.
 * Fully responsive: stacks vertically on mobile, uses larger tap targets,
 * and shows an inline progress bar during upload.
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import UploadZone from '../components/UploadZone';
import ImagePreviewGrid from '../components/ImagePreviewGrid';
import { useUpload } from '../hooks/useUpload';

export default function HomePage() {
  const navigate = useNavigate();
  const { files, addFiles, removeFile, upload, uploadProgress, isUploading, error } =
    useUpload();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFilesSelected = useCallback(
    (newFiles: File[]) => {
      if (!isUploading && !isSubmitting) addFiles(newFiles);
    },
    [addFiles, isUploading, isSubmitting],
  );

  const handleSubmit = async () => {
    if (files.length < 6) return;
    setIsSubmitting(true);
    const result = await upload();
    if (result?.job_id) navigate(`/result/${result.job_id}`);
    setIsSubmitting(false);
  };

  const canSubmit = files.length >= 6 && !isUploading && !isSubmitting;
  const needMore = files.length > 0 && files.length < 6;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-[#0a0e1a]/80 border-b border-white/5 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            TwoTh
          </span>
          <span className="text-xs text-white/30 hidden sm:block">3D from photos</span>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 px-4 py-6 sm:py-10">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Hero text */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2 pb-2"
          >
            <h1 className="text-3xl sm:text-5xl font-bold">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Turn Photos into 3D
              </span>
            </h1>
            <p className="text-white/50 text-sm sm:text-base">
              Upload 6+ photos of any object — get an interactive 3D model in minutes
            </p>
          </motion.div>

          {/* Upload zone */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <UploadZone
              onFilesSelected={handleFilesSelected}
              disabled={isUploading || isSubmitting}
              fileCount={files.length}
            />
          </motion.div>

          {/* Preview grid */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <ImagePreviewGrid files={files} onRemove={removeFile} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-red-500/15 border border-red-500/40 rounded-xl"
              >
                <p className="text-red-400 text-sm text-center">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload progress bar */}
          <AnimatePresence>
            {isUploading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <div className="flex justify-between text-xs text-white/50">
                  <span>Uploading images…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Minimum count hint */}
          <AnimatePresence>
            {needMore && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-white/40 text-sm"
              >
                Add {6 - files.length} more image{6 - files.length > 1 ? 's' : ''} to unlock reconstruction
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-center pb-4"
              >
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`
                    w-full sm:w-auto min-w-[220px]
                    px-8 py-4 rounded-2xl text-base sm:text-lg font-semibold
                    transition-all duration-300 active:scale-95
                    ${canSubmit
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.03]'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                    }
                  `}
                >
                  {isSubmitting
                    ? 'Uploading…'
                    : needMore
                      ? `Need ${6 - files.length} more image${6 - files.length > 1 ? 's' : ''}`
                      : `Start Reconstruction (${files.length} photos)`}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* How-it-works strip */}
          {files.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-3 gap-3 pt-4"
            >
              {[
                { icon: '📸', title: 'Photograph', desc: 'Take 6–30 photos around your object' },
                { icon: '⚙️', title: 'Reconstruct', desc: 'COLMAP builds a 3D point cloud & mesh' },
                { icon: '🌐', title: 'Explore', desc: 'Interact with your 3D model in the browser' },
              ].map((step) => (
                <div key={step.title} className="glass-panel p-4 text-center space-y-1">
                  <div className="text-2xl">{step.icon}</div>
                  <p className="text-xs sm:text-sm font-semibold text-white/80">{step.title}</p>
                  <p className="text-[10px] sm:text-xs text-white/40 leading-snug">{step.desc}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </main>

      <footer className="py-4 text-center text-white/20 text-xs">
        Powered by COLMAP · Three.js · FastAPI
      </footer>
    </div>
  );
}
