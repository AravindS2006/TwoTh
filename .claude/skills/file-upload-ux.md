# Skill: File Upload UX Best Practices

## Overview
Best practices for multi-image drag-and-drop upload with preview, progress, and validation.

---

## Drag-and-Drop Zone

```tsx
import { useCallback, useState } from 'react';

function UploadZone({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    onFilesSelected(files);
  }, [onFilesSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // Also support click-to-browse
  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/jpeg,image/png';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      onFilesSelected(files);
    };
    input.click();
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`
        border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
        transition-all duration-200
        ${isDragging
          ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.3)]'
          : 'border-white/20 hover:border-indigo-400 hover:bg-indigo-400/5'
        }
      `}
    >
      {/* Upload icon + instructions */}
    </div>
  );
}
```

---

## Client-Side Validation

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateImageFiles(files: File[]): ValidationResult {
  const errors: string[] = [];
  const MAX_SIZE_MB = 10;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
  const MIN_FILES = 6;
  const MAX_FILES = 30;

  if (files.length < MIN_FILES) {
    errors.push(`Please upload at least ${MIN_FILES} images (you selected ${files.length})`);
  }
  if (files.length > MAX_FILES) {
    errors.push(`Maximum ${MAX_FILES} images allowed (you selected ${files.length})`);
  }

  files.forEach((file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push(`"${file.name}" is not a JPG or PNG image`);
    }
    if (file.size > MAX_SIZE_BYTES) {
      errors.push(`"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB, max ${MAX_SIZE_MB}MB)`);
    }
  });

  return { valid: errors.length === 0, errors };
}
```

---

## Thumbnail Generation

```typescript
function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
}

// Generate all thumbnails in parallel
const thumbnails = await Promise.all(files.map(generateThumbnail));
```

---

## Upload Progress with XMLHttpRequest

```typescript
interface UploadProgress {
  fileIndex: number;
  percent: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

function uploadFiles(
  files: File[],
  onProgress: (progress: UploadProgress[]) => void
): Promise<{ jobId: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${import.meta.env.VITE_API_BASE}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        // Distribute progress evenly across files (simplified)
        onProgress(files.map((_, i) => ({
          fileIndex: i,
          percent,
          status: percent < 100 ? 'uploading' : 'done'
        })));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(xhr.responseText));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}
```

---

## Angle Label Auto-Assignment

```typescript
const ANGLE_LABELS = ['Front', 'Back', 'Left', 'Right', 'Top', 'Diagonal 1', 'Diagonal 2', 'Diagonal 3'];

function autoAssignLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    i < ANGLE_LABELS.length ? ANGLE_LABELS[i] : `View ${i + 1}`
  );
}
```

---

## Reorder with @dnd-kit

```tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable';

function SortableImage({ id, src }: { id: string; src: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: `translate(${transform?.x}px, ${transform?.y}px)`, transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <img src={src} className="w-full h-24 object-cover rounded-lg" />
    </div>
  );
}
```

---

## UX Rules

1. **Immediate feedback**: Show thumbnail as soon as file is selected (before upload starts)
2. **File count badge**: Show "X / 30 images" counter in real-time
3. **Clear validation errors**: Show errors inline, per-file where possible
4. **Progress per file**: Show individual progress bars OR a single overall bar
5. **Remove button**: ✕ button visible on hover for each thumbnail
6. **Duplicate detection**: Warn if same filename added twice
7. **File size display**: Show "2.4 MB" under each thumbnail
8. **Mobile fallback**: If `ondrop` not supported, click-to-browse input works
9. **Submit disabled**: Keep "Start Reconstruction" button disabled until ≥ 6 valid images
10. **Loading state**: Replace upload zone with progress view once upload starts
