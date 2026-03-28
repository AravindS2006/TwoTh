/**
 * ResultPage — Shows reconstruction progress then the interactive 3D viewer.
 * Fully responsive: viewer stacks above controls/stats on mobile.
 */
import { useState, useCallback, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReconstructionStatus from '../components/ReconstructionStatus';
import ModelViewer3D from '../components/ModelViewer3D';
import ViewerControls from '../components/ViewerControls';
import ResultsPanel from '../components/ResultsPanel';
import { useReconstruction } from '../hooks/useReconstruction';
import { useModelLoader } from '../hooks/useModelLoader';
import type { LightPreset } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export default function ResultPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [wireframe, setWireframe] = useState(false);
  const [lightPreset, setLightPreset] = useState<LightPreset>('studio');
  const [autoRotate, setAutoRotate] = useState(false);

  const { start, currentStep, currentProgress, message, isComplete, isProcessing, error } =
    useReconstruction(jobId ?? '');

  // Only load model once reconstruction is complete and we have a real jobId
  const { modelUrl, stats, isLoading: isModelLoading, error: modelError } = useModelLoader(
    isComplete && jobId ? jobId : '',
  );

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `model-${jobId?.slice(0, 8)}.png`;
      link.click();
    }
  }, [jobId]);

  const handleDownloadGLB = () => window.open(`${API_BASE}/api/model/${jobId}`, '_blank');
  const handleDownloadOBJ = () => window.open(`${API_BASE}/api/model/${jobId}/obj`, '_blank');

  if (!jobId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-white/50">No job ID — please go back and upload images.</p>
      </div>
    );
  }

  const showReady = !isProcessing && !isComplete;
  const showProcessing = isProcessing || (isComplete && !modelUrl && !modelError);
  const showModelLoading = isComplete && isModelLoading && !modelUrl;
  const showModelError = isComplete && !!modelError && !modelUrl;
  const showViewer = !!modelUrl && !modelError;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-[#0a0e1a]/80 border-b border-white/5 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm"
            aria-label="Back to upload"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>

          <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            TwoTh
          </span>

          <span className="text-xs text-white/30 hidden sm:block truncate max-w-[160px]">
            {jobId.slice(0, 8)}…
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 px-4 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <AnimatePresence mode="wait">
            {/* Ready to start */}
            {showReady && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="glass-panel p-8 max-w-md mx-auto text-center space-y-4"
              >
                <div className="text-4xl">🚀</div>
                <h2 className="text-xl font-semibold text-white">Ready to Reconstruct</h2>
                <p className="text-white/50 text-sm leading-relaxed">
                  Click below to start the 3D reconstruction pipeline. This takes 2–10 minutes
                  depending on image count.
                </p>
                <button
                  onClick={start}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold
                    hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 active:scale-95"
                >
                  Start Reconstruction
                </button>
              </motion.div>
            )}

            {/* Processing */}
            {showProcessing && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ReconstructionStatus
                  currentStep={currentStep}
                  progress={currentProgress}
                  message={message}
                  error={error}
                />
              </motion.div>
            )}

            {/* Model loading spinner */}
            {showModelLoading && (
              <motion.div
                key="modelLoading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel p-12 text-center space-y-4"
              >
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-white/50 text-sm">Preparing 3D model…</p>
              </motion.div>
            )}

            {/* Model load error */}
            {showModelError && (
              <motion.div
                key="modelError"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel p-8 text-center space-y-4"
              >
                <p className="text-red-400">{modelError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-sm transition-colors"
                >
                  Retry
                </button>
              </motion.div>
            )}

            {/* 3D viewer */}
            {showViewer && (
              <motion.div
                key="viewer"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Viewer + sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Canvas */}
                  <div className="lg:col-span-2 glass-panel p-3 sm:p-4">
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center h-[300px] sm:h-[480px]">
                          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      }
                    >
                      <ModelViewer3D
                        url={modelUrl}
                        wireframe={wireframe}
                        lightPreset={lightPreset}
                        autoRotate={autoRotate}
                        onScreenshot={handleScreenshot}
                      />
                    </Suspense>
                  </div>

                  {/* Stats + downloads (right sidebar on desktop, below on mobile) */}
                  <ResultsPanel
                    jobId={jobId}
                    stats={stats}
                    onDownloadGLB={handleDownloadGLB}
                    onDownloadOBJ={handleDownloadOBJ}
                  />
                </div>

                {/* Viewer controls — full-width strip */}
                <ViewerControls
                  wireframe={wireframe}
                  setWireframe={setWireframe}
                  lightPreset={lightPreset}
                  setLightPreset={setLightPreset}
                  autoRotate={autoRotate}
                  setAutoRotate={setAutoRotate}
                  onScreenshot={handleScreenshot}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
