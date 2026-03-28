# Code Review Hook — Before Finalizing Any Component

## Instructions for Claude Code

Before marking any component or module as complete, review against these criteria:

---

## 🔍 Three.js Memory Leak Audit (Frontend)

For EVERY Three.js/React Three Fiber component:

```typescript
// ✅ CORRECT pattern
useEffect(() => {
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geometry, material);

  return () => {
    geometry.dispose();      // ← REQUIRED
    material.dispose();      // ← REQUIRED
    // texture.dispose() if textures used
  };
}, []);
```

Check list:
- [ ] Every `new THREE.BufferGeometry()` → `.dispose()` in cleanup
- [ ] Every `new THREE.Material()` → `.dispose()` in cleanup
- [ ] Every `new THREE.Texture()` → `.dispose()` in cleanup
- [ ] `useGLTF` / `useLoader` — use `useGLTF.preload()` and handle cache properly
- [ ] Canvas `renderer` — `renderer.dispose()` on component unmount
- [ ] OrbitControls — `controls.dispose()` on unmount

---

## 🔄 Loading States Audit

For EVERY async operation:

```typescript
// ✅ REQUIRED pattern
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<T | null>(null);

// Loading skeleton shown when isLoading = true
// Error message shown when error != null
// Content shown when data != null && !isLoading
```

Check list:
- [ ] Every API call has: isLoading, error, data states
- [ ] Loading state shows skeleton or spinner (not just blank)
- [ ] Error state shows user-friendly message (not raw Error.message)
- [ ] Empty state handled (data = [] or data = null after load)

---

## 📱 Mobile Responsiveness Audit

- [ ] No fixed pixel widths that break on mobile
- [ ] Touch interactions work (OrbitControls has touch support enabled)
- [ ] Upload zone works on mobile (file input fallback if drag-drop unavailable)
- [ ] Text readable on small screens (min font size 14px)
- [ ] Buttons large enough for touch (min 44x44px tap target)
- [ ] Test mental model: How does this look on a 375px wide iPhone?

---

## 💬 User-Friendly Error Messages

Replace technical errors with friendly messages:

| Technical | User-Friendly |
|---|---|
| "COLMAP: sparse reconstruction failed" | "We couldn't find enough matching points between your photos. Try adding more images with overlapping views." |
| "File size exceeds limit" | "This image is too large (max 10MB). Try compressing it first." |
| "Network Error: fetch failed" | "Connection to server lost. Please check your internet and try again." |
| "timeout after 300s" | "Reconstruction took too long. Try with fewer or smaller images." |
| "Not enough images" | "Please upload at least 6 photos from different angles." |

Check list:
- [ ] No raw exception messages shown to user
- [ ] Error messages include actionable advice
- [ ] Errors are dismissable
- [ ] Error messages don't expose internal paths or stack traces

---

## ♿ Accessibility Quick Check
- [ ] Images have `alt` text
- [ ] Buttons have descriptive labels (not just icons without aria-label)
- [ ] Color is not the only indicator of state (icons + text too)
- [ ] Focus states visible for keyboard navigation
