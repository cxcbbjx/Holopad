# Holopad (Prototype v1.0)

Holopad is an early-stage spatial computing interface exploring mathematical models, real-time graphics, and human-computer interaction. It bridges the gap between 2D imagery and 3D spatial environments.

## What is it?
Holopad is a web-based **Spatial Interface Prototype** that allows users to transform static images into interactive 3D holograms and manipulate them in a "Creative Space" using hand gestures.

## Key Features (v0.1)
- **Image-to-Hologram Pipeline:** Upload any image to generate a textured 3D model (GLB) using AI segmentation (SAM) and mathematical extrusion.
- **Creative Space (Voxel Editor):** A fully functional 3D editor where users can build structures pixel-by-pixel (voxel-by-voxel) in mid-air.
- **Hand Tracking:** Touchless interaction using computer vision (MediaPipe) to pinch, draw, and manipulate objects.
- **AR/Passthrough Mode:** Visualizes 3D content overlaid on the real world using the device's webcam.
- **Instant Capture:** Built-in screenshot tool to capture and share AR creations.

## Tech Stack
- **Frontend:** React, Vite, Three.js, React-Three-Fiber
- **Computer Vision:** MediaPipe Hands (Google)
- **AI/Backend:** Node.js, Express, Python (SAM integration)
- **Audio:** Howler.js for spatial soundscapes

## Vision
The goal is to move interaction away from flat screens and into physical space, where depth, motion, and intent are captured directly.

## Author
Shivang — Founder, Holopad

