# TwoTh - Multi-View 3D Object Reconstruction Web App

A production-grade, visually impressive full-stack web application that allows users to upload photos of physical objects and generates interactive 3D models viewable in the browser.

![Tech Stack](https://img.shields.io/badge/React-18.2-blue)
![Tech Stack](https://img.shields.io/badge/TypeScript-5.2-blue)
![Tech Stack](https://img.shields.io/badge/FastAPI-python-green)
![Tech Stack](https://img.shields.io/badge/Three.js-r160-blue)

---

## 🔗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                              Browser                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐    │
│  │  UploadZone │───▶│ ImagePreview │───▶│   ModelViewer3D     │    │
│  └─────────────┘    └──────────────┘    └─────────────────────┘    │
│         │                │                        │                  │
│         └────────────────┼────────────────────────┘                  │
│                          ▼                                            │
│                   React + Three.js                                    │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ HTTP / SSE
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend                               │
│  ┌────────────┐    ┌─────────────────┐    ┌───────────────────┐    │
│  │   Upload   │───▶│  Reconstruct    │───▶│     Download      │    │
│  └────────────┘    └─────────────────┘    └───────────────────┘    │
│         │                   │                      │                 │
│         └───────────────────┼──────────────────────┘                 │
│                             ▼                                          │
│                    COLMAP Pipeline                                     │
│                 (SfM + MVS + Meshing)                                  │
│                             │                                          │
│                             ▼                                          │
│                    Open3D / trimesh                                    │
│                         │                                              │
│                         ▼                                              │
│                    .GLB Output                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Features

### Upload Experience
- Drag-and-drop zone accepting 6–30 images simultaneously
- Real-time thumbnail previews with angle labels
- Client-side validation (JPG/PNG only, max 10MB each)
- Animated upload progress bar

### 3D Viewer
- Load and display .GLB models with auto-centering and auto-scaling
- OrbitControls: rotate, zoom, pan
- Toggle wireframe mode
- 3 lighting presets (Studio, Outdoor, Dramatic)
- Download model as .GLB or .OBJ
- Screenshot functionality
- Auto-rotate (turntable) mode

### Visual Design
- Dark, modern UI with neon accent colors
- Smooth Framer Motion transitions
- Animated processing screen with rotating 3D cube
- Glassmorphism panels
- Fully responsive

---

## 🛠️ Prerequisites

- **Docker** & Docker Compose
- **Node.js** 18+ (for local frontend development)
- **Python** 3.11+ (for local backend development)
- **COLMAP** (installed in backend container)

---

## 🚀 Quick Start

### Development (Docker Compose)

```bash
# Clone and navigate to project
cd TwoTh

# Start all services
docker-compose up --build

# Access at:
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables (see .env.example)
export COLMAP_PATH=colmap
export SIMULATION_MODE=false
export UPLOAD_DIR=./uploads
export OUTPUT_DIR=./outputs

# Run server
uvicorn backend.main:app --reload
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local (create from .env.local)
echo "VITE_API_BASE=http://localhost:8000" > .env.local

# Run development server
npm run dev
```

---

## 📚 API Documentation

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload` | Upload 6-30 images |
| POST | `/api/reconstruct/{job_id}` | Start reconstruction |
| GET | `/api/status/{job_id}` | SSE status stream |
| GET | `/api/model/{job_id}` | Download GLB model |
| GET | `/api/model/{job_id}/obj` | Download OBJ model |
| GET | `/api/stats/{job_id}` | Get model statistics |
| GET | `/api/health` | Health check |

### Example Usage

#### Upload Images
```bash
curl -X POST http://localhost:8000/api/upload \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg" \
  # ... add 6+ images
```

**Response:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "image_count": 8,
  "images": ["photo1.jpg", "photo2.jpg", ...]
}
```

#### Start Reconstruction
```bash
curl -X POST http://localhost:8000/api/reconstruct/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "message": "Reconstruction started",
  "job_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Status Stream (SSE)
```javascript
const eventSource = new EventSource('http://localhost:8000/api/status/{job_id}');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data); // { step: "extracting", progress: 20, message: "Extracting features..." }
};
```

---

## 🔬 How It Works

### Structure from Motion (SfM)
SfM finds matching keypoints across multiple photos and estimates camera positions:
1. **Feature Extraction**: Identifies corners/edges in each image
2. **Matching**: Finds common features between image pairs
3. **Sparse Reconstruction**: Builds a 3D point cloud with camera poses

### Multi-View Stereo (MVS)
MVS generates dense 3D geometry from SfM results:
1. **Undistortion**: Corrects lens distortion
2. **Depth Estimation**: Computes depth for each pixel
3. **Stereo Fusion**: Merges depth maps into a dense point cloud

### Mesh Generation
1. **Poisson Surface Reconstruction**: Creates a watertight mesh
2. **Format Conversion**: Converts PLY to GLB for browser rendering

---

## 💡 Tips for Best Results

1. **Image Count**: Use 8-12 images for optimal reconstruction
2. **Coverage**: Capture images in a circle around the object (every 15-20°)
3. **Overlap**: Ensure >70% overlap between consecutive shots
4. **Lighting**: Use consistent, diffuse lighting (avoid harsh shadows)
5. **Avoid**: Reflective surfaces, transparent objects, textureless areas
6. **Stability**: Keep the object stationary during capture

---

## ⚠️ Known Limitations

1. **CPU Performance**: Dense reconstruction on CPU is slow (10-30 mins)
2. **GPU Required**: For faster results, enable GPU in docker-compose
3. **Object Size**: Works best for objects that fit on a table
4. **Complex Surfaces**: May struggle with highly reflective materials

## 🩺 Troubleshooting

1. **Output always looks like a random spiky blob/cube**: Ensure `SIMULATION_MODE=false` in backend env (`docker-compose.yml` or `.env`).
2. **Reconstruction fails quickly with COLMAP errors**: Verify COLMAP is installed and `COLMAP_PATH` points to a valid executable.
3. **"No images with matches" / "No good initial image pair"**: Your images likely have too little overlap or too many near-duplicates. Use 8-12 distinct views around the object with 60-80% overlap between adjacent shots.
4. **Upload accepted files but reconstruction still weak**: Avoid repeating the same frame; include all sides and keep focus sharp with consistent lighting.

---

## 🧰 Tech Stack

### Frontend
- React 18 + Vite + TypeScript
- Tailwind CSS (dark theme)
- React Three Fiber + Drei
- Framer Motion

### Backend
- Python 3.11 + FastAPI
- COLMAP (SfM + MVS)
- Open3D + trimesh (mesh processing)

### Infrastructure
- Docker + Docker Compose
- Server-Sent Events (SSE)

---

## 📄 License

MIT License - College Project

---

## 🙏 Acknowledgments

- [COLMAP](https://colmap.github.io/) - Structure-from-Motion library
- [Three.js](https://threejs.org/) - 3D graphics library
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - React renderer for Three.js
READMEOF
