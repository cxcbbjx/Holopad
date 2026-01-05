import { useEffect, useRef } from 'react';
import { Howl, Howler } from 'howler';

// Silent mp3 base64 to prevent load errors
const SILENT_MP3 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAP//OEAAAAAAAAAAAAAAAAAAAAAATEFNRTMuMTAwqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqg=';

// Placeholder assets - using silent mp3s for now to avoid CORS errors
// User should replace these with real assets in src/assets/audio/
const SOUNDS = {
  click: SILENT_MP3, 
  ambient: SILENT_MP3,
  hover: SILENT_MP3
};

class SoundManager {
  constructor() {
    this.sounds = {};
    this.enabled = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    // Initialize sounds
    this.sounds.click = new Howl({
      src: [SOUNDS.click],
      volume: 0.5,
    });

    this.sounds.hover = new Howl({
      src: [SOUNDS.hover],
      volume: 0.2,
    });

    this.sounds.ambient = new Howl({
      src: [SOUNDS.ambient],
      html5: true, 
      loop: true,
      volume: 0.0, 
    });

    this.initialized = true;
  }

  playClick() {
    if (!this.enabled) return;
    this.sounds.click?.play();
  }

  playHover() {
    if (!this.enabled) return;
    this.sounds.hover?.play();
  }

  startAmbient() {
    if (!this.enabled || !this.sounds.ambient) return;
    if (!this.sounds.ambient.playing()) {
      this.sounds.ambient.play();
      this.sounds.ambient.fade(0, 0.3, 2000);
    }
  }

  stopAmbient() {
    if (this.sounds.ambient) {
      this.sounds.ambient.fade(0.3, 0, 1000);
      setTimeout(() => this.sounds.ambient.stop(), 1000);
    }
  }

  toggleMute() {
    this.enabled = !this.enabled;
    Howler.mute(!this.enabled);
  }
}

export const soundManager = new SoundManager();

export const useSound = () => {
  useEffect(() => {
    // Initialize on first user interaction to bypass autoplay policies
    const handleInteraction = () => {
      soundManager.init();
      soundManager.startAmbient();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  return soundManager;
};
