/**
 * ModelViewer3D - Interactive 3D model viewer using React Three Fiber.
 */
import { Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Html, Loader, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import type { LightPreset } from '../types';

interface ModelViewer3DProps {
  url: string;
  wireframe: boolean;
  lightPreset: LightPreset;
  autoRotate: boolean;
}

function AutoScaledModel({ url, wireframe }: { url: string; wireframe: boolean }) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    scene.position.sub(center);

    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 2 / maxDim : 1;
    scene.scale.setScalar(scale);
  }, [scene]);

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => { (m as THREE.Material & { wireframe: boolean }).wireframe = wireframe; });
        } else {
          (mesh.material as THREE.Material & { wireframe: boolean }).wireframe = wireframe;
        }
      }
    });
  }, [wireframe, scene]);

  return <primitive object={scene} />;
}

function SceneLighting({ preset }: { preset: LightPreset }) {
  switch (preset) {
    case 'studio':
      return (
        <>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <directionalLight position={[-5, 5, -5]} intensity={0.5} />
          <pointLight position={[0, -5, 0]} intensity={0.3} color="#6366f1" />
        </>
      );
    case 'outdoor':
      return (
        <>
          <ambientLight intensity={0.6} color="#b1d4e0" />
          <directionalLight position={[10, 20, 5]} intensity={1.5} color="#fff5e0" castShadow />
          <hemisphereLight args={['#87ceeb', '#8B7355', 0.4]} />
        </>
      );
    case 'dramatic':
      return (
        <>
          <ambientLight intensity={0.1} />
          <spotLight position={[5, 10, 5]} angle={0.3} penumbra={0.5} intensity={2} castShadow />
          <pointLight position={[-5, 0, -5]} intensity={0.5} color="#6366f1" />
        </>
      );
    default:
      return null;
  }
}

function Turntable({ autoRotate }: { autoRotate: boolean }) {
  const { scene } = useThree();

  useFrame((_, delta) => {
    if (autoRotate) {
      scene.rotation.y += delta * 0.5;
    }
  });

  return null;
}

export default function ModelViewer3D({
  url,
  wireframe,
  lightPreset,
  autoRotate,
}: ModelViewer3DProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full h-full min-h-[400px]"
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        dpr={[1, 2]}
        shadows
      >
        <Suspense fallback={<Html center><Loader /></Html>}>
          <Environment preset="studio" />
          <SceneLighting preset={lightPreset} />
          <AutoScaledModel url={url} wireframe={wireframe} />
          <ContactShadows
            position={[0, -1.2, 0]}
            opacity={0.45}
            scale={10}
            blur={2.5}
            far={8}
            resolution={1024}
          />
          <Turntable autoRotate={autoRotate} />
        </Suspense>
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={0.5}
          maxDistance={10}
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
        />
      </Canvas>
    </motion.div>
  );
}
