# HOLOPAD

Holopad is an early-stage spatial computing interface exploring mathematical models, real-time graphics, and human-computer interaction. It bridges the gap between 2D imagery and 3D spatial environments.

Combines high-end WebGL graphics (Three.js) with artificial intelligence to create a workspace that feels less like a tool and more like a science fiction environment.

## What is it?
Holopad is a web-based Spatial Interface Prototype that allows users to transform static images into interactive 3D holograms and manipulate them in a “Creative Space” using hand gestures.

## Key Features
- Image-to-Hologram Pipeline: Upload any image to generate a textured 3D model (GLB) using AI segmentation (SAM) and mathematical extrusion.
- Creative Space (Voxel Editor): Build structures pixel-by-pixel (voxel-by-voxel) in mid-air.
- Hand Tracking: Touchless interaction using computer vision (MediaPipe) to pinch, draw, and manipulate objects.
- AR/Passthrough Mode: Visualize 3D content overlaid on the real world using the device’s webcam.
- Instant Capture: Capture and share AR creations.

## Tech Stack
- Frontend: React, Vite, Three.js, React-Three-Fiber
- Computer Vision: MediaPipe Hands (Google)
- AI/Backend: Node.js, Express, Python (SAM integration)
- Audio: Howler.js for spatial soundscapes

## Vision
Move interaction away from flat screens and into physical space, where depth, motion, and intent are captured directly.

## Author
Shivang — Founder, Holopad
