# Skill: Three.js 3D Viewer Best Practices

## Overview
This skill covers rendering `.OBJ` / `.GLB` files in React Three Fiber (R3F) with production-quality UX.

---

## Setup: Required Packages

```json
{
  "@react-three/fiber": "^8.x",
  "@react-three/drei": "^9.x",
  "three": "^0.160.x",
  "@types/three": "^0.160.x"
}
```

---

## GLB Model Loading with Auto-Center + Auto-Scale

```typescript
import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3, Object3D } from 'three';

function AutoScaledModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = useRef<Object3D>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Auto-center: move model so its bounding box center is at origin
    const box = new Box3().setFromObject(ref.current);
    const center = new Vector3();
    box.getCenter(center);
    ref.current.position.sub(center);

    // Auto-scale: fit model within a unit cube
    const size = new Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim; // fit in 2-unit cube
    ref.current.scale.setScalar(scale);
  }, [scene]);

  return <primitive object={scene} ref={ref} />;
}
```

---

## OrbitControls Setup

```tsx
import { OrbitControls } from '@react-three/drei';

// Inside <Canvas>:
<OrbitControls
  enablePan={true}
  enableZoom={true}
  enableRotate={true}
  minDistance={0.5}
  maxDistance={10}
  // Mobile touch support
  touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
/>
```

---

## Lighting Presets

```tsx
// Studio lighting
function StudioLighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />
      <pointLight position={[0, -5, 0]} intensity={0.3} color="#6366f1" />
    </>
  );
}

// Outdoor lighting
function OutdoorLighting() {
  return (
    <>
      <ambientLight intensity={0.6} color="#b1d4e0" />
      <directionalLight position={[10, 20, 5]} intensity={1.5} color="#fff5e0" castShadow />
      <hemisphereLight args={['#87ceeb', '#8B7355', 0.4]} />
    </>
  );
}

// Dramatic lighting
function DramaticLighting() {
  return (
    <>
      <ambientLight intensity={0.1} />
      <spotLight position={[5, 10, 5]} angle={0.3} penumbra={0.5} intensity={2} castShadow />
      <pointLight position={[-5, 0, -5]} intensity={0.5} color="#6366f1" />
    </>
  );
}
```

---

## Wireframe Toggle

```tsx
// Pass wireframe prop into model
function Model({ url, wireframe }: { url: string; wireframe: boolean }) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => { m.wireframe = wireframe; });
        } else {
          (mesh.material as THREE.Material & { wireframe: boolean }).wireframe = wireframe;
        }
      }
    });
  }, [wireframe, scene]);

  return <primitive object={scene} />;
}
```

---

## Screenshot Export

```tsx
import { useThree } from '@react-three/fiber';

function ScreenshotButton() {
  const { gl } = useThree();

  const takeScreenshot = () => {
    gl.render(scene, camera); // ensure latest frame
    const dataURL = gl.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'model-screenshot.png';
    link.click();
  };

  return <button onClick={takeScreenshot}>📷 Screenshot</button>;
}
```

**Note:** Canvas must be created with `gl={{ preserveDrawingBuffer: true }}` for screenshots to work.

---

## Loading Progress Indicator

```tsx
import { Html, useProgress } from '@react-three/drei';

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-cyan-400 text-sm">
        Loading model... {Math.round(progress)}%
      </div>
    </Html>
  );
}

// Usage:
<Canvas>
  <Suspense fallback={<Loader />}>
    <Model url={modelUrl} />
  </Suspense>
</Canvas>
```

---

## Memory Cleanup Template

```typescript
useEffect(() => {
  return () => {
    // Cleanup when component unmounts
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
    useGLTF.clear(url);
  };
}, [url, scene]);
```

---

## Canvas Configuration

```tsx
<Canvas
  camera={{ position: [0, 0, 5], fov: 50 }}
  gl={{ antialias: true, preserveDrawingBuffer: true }}
  shadows
  dpr={[1, 2]} // Limit pixel ratio for performance
>
```

---

## Turntable / Auto-Rotate

```tsx
import { useFrame } from '@react-three/fiber';

function TurntableModel({ url, rotating }: { url: string; rotating: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  useFrame((_, delta) => {
    if (rotating && ref.current) {
      ref.current.rotation.y += delta * 0.5; // 0.5 rad/s
    }
  });

  return <primitive object={scene} ref={ref} />;
}
```
