/**
 * ViewerControls — Controls for wireframe, lighting, screenshot, and auto-rotation.
 * Wraps into a scrollable row on mobile with larger tap targets.
 */
import { motion } from 'framer-motion';
import type { LightPreset } from '../types';

interface ViewerControlsProps {
  wireframe: boolean;
  setWireframe: (v: boolean) => void;
  lightPreset: LightPreset;
  setLightPreset: (v: LightPreset) => void;
  autoRotate: boolean;
  setAutoRotate: (v: boolean) => void;
  onScreenshot: () => void;
}

const LIGHT_PRESETS: { value: LightPreset; label: string; icon: string }[] = [
  { value: 'studio', label: 'Studio', icon: '💡' },
  { value: 'outdoor', label: 'Outdoor', icon: '☀️' },
  { value: 'dramatic', label: 'Dramatic', icon: '🎭' },
];

/** Small toggle / action pill */
function Pill({
  active,
  onClick,
  children,
  activeClass = 'bg-indigo-500 text-white',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        whitespace-nowrap flex-shrink-0
        px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium
        transition-all duration-200 active:scale-95 touch-manipulation
        ${active ? activeClass : 'bg-white/10 text-white/70 hover:bg-white/20'}
      `}
    >
      {children}
    </button>
  );
}

export default function ViewerControls({
  wireframe,
  setWireframe,
  lightPreset,
  setLightPreset,
  autoRotate,
  setAutoRotate,
  onScreenshot,
}: ViewerControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-3 sm:p-4"
    >
      {/* Horizontally scrollable strip — no wrapping on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {/* Toggle controls */}
        <Pill active={wireframe} onClick={() => setWireframe(!wireframe)}>
          ⬡ Wireframe
        </Pill>

        <Pill
          active={autoRotate}
          onClick={() => setAutoRotate(!autoRotate)}
          activeClass="bg-cyan-500 text-white"
        >
          {autoRotate ? '⏹ Stop' : '🔄 Rotate'}
        </Pill>

        {/* Screenshot — never "active" */}
        <button
          type="button"
          onClick={onScreenshot}
          className="
            whitespace-nowrap flex-shrink-0
            px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium
            bg-white/10 text-white/70 hover:bg-white/20
            transition-all duration-200 active:scale-95 touch-manipulation
          "
        >
          📷 Screenshot
        </button>

        {/* Divider */}
        <div className="w-px bg-white/15 flex-shrink-0 self-stretch mx-1" aria-hidden="true" />

        {/* Lighting presets */}
        {LIGHT_PRESETS.map((preset) => (
          <Pill
            key={preset.value}
            active={lightPreset === preset.value}
            onClick={() => setLightPreset(preset.value)}
          >
            {preset.icon} {preset.label}
          </Pill>
        ))}
      </div>
    </motion.div>
  );
}
