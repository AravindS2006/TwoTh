/**
 * ResultsPanel - Displays model stats and download/share options.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ModelStats } from '../types';

interface ResultsPanelProps {
  jobId: string;
  stats: ModelStats | null;
  onDownloadGLB: () => void;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ResultsPanel({ jobId, stats, onDownloadGLB }: ResultsPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleShareLink = async () => {
    const url = `${window.location.origin}/result/${jobId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleARPreview = () => {
    const url = `${window.location.origin}/ar/${jobId}`;
    window.open(url, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-panel p-6 space-y-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Model Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/50 uppercase tracking-wider">Vertices</p>
            <p className="text-xl font-bold text-indigo-400">
              {stats ? formatNumber(stats.vertices) : '—'}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-white/50 uppercase tracking-wider">Faces</p>
            <p className="text-xl font-bold text-cyan-400">
              {stats ? formatNumber(stats.faces) : '—'}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 col-span-2">
            <p className="text-xs text-white/50 uppercase tracking-wider">File Size</p>
            <p className="text-xl font-bold text-green-400">
              {stats ? formatBytes(stats.file_size_bytes) : '—'}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Download Options</h3>
        <div className="flex flex-col gap-2">
          <button
            onClick={onDownloadGLB}
            className="w-full py-3 rounded-lg font-medium bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white transition-all duration-200"
          >
            Download PBR GLB
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Share</h3>
        <div className="flex gap-2">
          <button
            onClick={handleShareLink}
            className="flex-1 py-3 rounded-lg font-medium bg-white/10 hover:bg-white/20 text-white/80 transition-all duration-200"
          >
            {copied ? '✓ Link Copied!' : 'Copy Share Link'}
          </button>
          <button
            onClick={handleARPreview}
            className="py-3 px-4 rounded-lg font-medium bg-white/10 hover:bg-white/20 text-white/80 transition-all duration-200"
            title="View in AR"
          >
            📱 AR
          </button>
        </div>
      </div>
    </motion.div>
  );
}
