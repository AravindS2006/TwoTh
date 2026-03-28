/**
 * ReconstructionStatus - Shows processing progress with animated 3D cube.
 */
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { STEPS_CONFIG } from '../types';

interface ReconstructionStatusProps {
  currentStep: string;
  progress: number;
  message: string;
  error?: string | null;
}

function RotatingCube() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.7;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial
        color="#6366f1"
        emissive="#6366f1"
        emissiveIntensity={0.3}
        wireframe
      />
    </mesh>
  );
}

const steps = [
  { key: 'extracting', ...STEPS_CONFIG.extracting },
  { key: 'matching', ...STEPS_CONFIG.matching },
  { key: 'sparse', ...STEPS_CONFIG.sparse },
  { key: 'undistort', ...STEPS_CONFIG.undistort },
  { key: 'dense', ...STEPS_CONFIG.dense },
  { key: 'fusion', ...STEPS_CONFIG.fusion },
  { key: 'meshing', ...STEPS_CONFIG.meshing },
  { key: 'done', ...STEPS_CONFIG.done },
];

export default function ReconstructionStatus({
  currentStep,
  progress,
  message,
  error,
}: ReconstructionStatusProps) {
  const activeIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel p-8 max-w-lg mx-auto"
    >
      <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
        {error ? 'Reconstruction Failed' : 'Reconstructing Your Object'}
      </h2>

      <div className="flex justify-center mb-8">
        <div className="w-32 h-32">
          <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#6366f1" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#22d3ee" />
            <RotatingCube />
          </Canvas>
        </div>
      </div>

      {error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4"
        >
          <p className="text-red-400 text-center">{error}</p>
          <p className="text-white/60 text-sm text-center mt-2">
            Tips: Try adding more images with overlapping views, ensure consistent lighting, avoid reflective surfaces.
          </p>
        </motion.div>
      ) : (
        <>
          <div className="mb-6">
            <div className="flex justify-between text-sm text-white/60 mb-2">
              <span>{message}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {steps.slice(0, -1).map((step, index) => {
              const isActive = index === activeIndex;
              const isComplete = index < activeIndex;
              const isPending = index > activeIndex;

              return (
                <motion.div
                  key={step.key}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg
                    transition-colors duration-300
                    ${isActive ? 'bg-indigo-500/20 border border-indigo-500/50' : ''}
                    ${isComplete ? 'bg-green-500/10' : ''}
                    ${isPending ? 'bg-white/5 opacity-50' : ''}
                  `}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${isComplete ? 'bg-green-500' : isActive ? 'bg-indigo-500 animate-pulse' : 'bg-white/10'}
                  `}>
                    {isComplete ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isActive ? (
                      <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <span className="text-xs text-white/50">{index + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm ${isActive ? 'text-white font-medium' : 'text-white/60'}`}>
                    {step.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
