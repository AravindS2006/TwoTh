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
  const { files, addFiles, removeFile, beginSession, error, clearError } =
    useUpload();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFilesSelected = useCallback(
    (newFiles: File[]) => {
      if (!isSubmitting) {
        clearError();
        addFiles(newFiles);
      }
    },
    [addFiles, clearError, isSubmitting],
  );

  const handleSubmit = async () => {
    if (files.length < 4) return;

    setIsSubmitting(true);
    const session = beginSession();

    if (session) {
      const localJobId = crypto.randomUUID();
      navigate(`/result/${localJobId}`, {
        state: {
          sourceImages: session.sourceImages,
        },
      });
    }

    setIsSubmitting(false);
  };

  const canSubmit = files.length >= 4 && !isSubmitting;
  const needMore = files.length > 0 && files.length < 4;

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
              Upload 4-6 orthographic views (Front, Back, Left, Right) for a cinema-grade PBR model
            </p>
          </motion.div>

          {/* Upload zone */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <UploadZone
              onFilesSelected={handleFilesSelected}
              disabled={isSubmitting}
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

          {/* Minimum count hint */}
          <AnimatePresence>
            {needMore && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-white/40 text-sm"
              >
                Add {4 - files.length} more required view{4 - files.length > 1 ? 's' : ''} (Front, Back, Left, Right)
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
                    ? 'Preparing Session...'
                    : needMore
                      ? `Need ${4 - files.length} more view${4 - files.length > 1 ? 's' : ''}`
                      : `Start PBR Generation (${files.length} views)`}
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
                { icon: '📸', title: 'Capture', desc: 'Collect Front, Back, Left, Right views (plus optional Top/Bottom)' },
                { icon: '🎨', title: 'Generate', desc: 'Hunyuan3D-2mv shape + Hunyuan3D-2.1 Paint PBR texturing' },
                { icon: '🌐', title: 'Explore', desc: 'Inspect physically based materials under studio lighting' },
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
        Powered by Hugging Face Spaces · Hunyuan3D · Three.js
      </footer>
    </div>
  );
}
