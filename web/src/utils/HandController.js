import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export class HandController {
  constructor(videoElement, onResults) {
    this.videoElement = videoElement;
    this.onResults = onResults;
    this.hands = null;
    this.camera = null;
    this.lastPinch = false;
    this.pinchThreshold = 0.05; // Adjust based on coordinate system (0-1)
  }

  async initialize() {
    this.hands = new Hands({
      locateFile: (file) => {
        return `/mediapipe/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults(this.processResults.bind(this));

    if (this.videoElement) {
      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          await this.hands.send({ image: this.videoElement });
        },
        width: 1280,
        height: 720
      });
      await this.camera.start();
    }
  }

  processResults(results) {
    const data = {
      hands: [],
      gesture: 'none', // 'pinch', 'open', 'scale'
      pinchDistance: 0,
      scaleFactor: 1,
      center: { x: 0, y: 0 }
    };

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      data.hands = results.multiHandLandmarks;

      // 1. Detect Pinch (Single Hand or Dominant Hand)
      // Use the first hand for primary interaction
      const h1 = results.multiHandLandmarks[0];
      const thumbTip = h1[4];
      const indexTip = h1[8];
      const middleTip = h1[12];
      const ringTip = h1[16];
      const pinkyTip = h1[20];
      
      const distance = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) + 
        Math.pow(thumbTip.y - indexTip.y, 2)
      );

      data.pinchDistance = distance;
      // Use Index Tip for X/Y, and average Z or Wrist-Index distance for depth
      // MediaPipe Z is relative to wrist, not absolute world depth. 
      // We can use hand size (wrist to middle MCP) as a proxy for absolute depth (closer = bigger = closer to camera)
      const wrist = h1[0];
      const middleMCP = h1[9];
      const handSize = Math.sqrt(
        Math.pow(wrist.x - middleMCP.x, 2) + 
        Math.pow(wrist.y - middleMCP.y, 2)
      );
      
      data.center = { 
        x: indexTip.x, 
        y: indexTip.y,
        depth: handSize // Pass hand size for Z-mapping (larger = closer)
      }; 

      // Gesture Logic
      if (distance < this.pinchThreshold) {
        data.gesture = 'pinch';
      } else {
        // Check for "Two Fingers" (Peace Sign) -> Delete
        // Index & Middle extended, Ring & Pinky curled
        const isIndexUp = indexTip.y < h1[6].y; // Tip above PIP (y is inverted in screen coords? 0 is top. Yes. Tip y < PIP y means UP)
        const isMiddleUp = middleTip.y < h1[10].y;
        const isRingDown = ringTip.y > h1[14].y;
        const isPinkyDown = pinkyTip.y > h1[18].y;
        
        if (isIndexUp && isMiddleUp && isRingDown && isPinkyDown) {
            data.gesture = 'delete';
        } else {
            data.gesture = 'open';
        }
      }

      // 2. Detect Scale (Two Hands)
      if (results.multiHandLandmarks.length === 2) {
        const h2 = results.multiHandLandmarks[1];
        const c1 = h1[9]; // Middle finger MCP (approx center of palm)
        const c2 = h2[9];
        
        const handDist = Math.sqrt(
            Math.pow(c1.x - c2.x, 2) + 
            Math.pow(c1.y - c2.y, 2)
        );
        
        data.scaleDistance = handDist;
        data.gesture = 'scale'; // Override if two hands are present
      }
    }

    if (this.onResults) {
      this.onResults(data);
    }
  }

  stop() {
    if (this.camera) this.camera.stop();
    if (this.hands) this.hands.close();
  }
}
