import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f1a);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.8, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Lights (REALISTIC, NOT SCI-FI)
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(3, 4, 2);
scene.add(key);

const rim = new THREE.DirectionalLight(0x88aaff, 0.6);
rim.position.set(-3, 2, -2);
scene.add(rim);

// Load Model
const loader = new GLTFLoader();
loader.load("/holoband.glb", (gltf) => {
  const band = gltf.scene;
  band.rotation.x = -0.4;
  scene.add(band);

  animate(band);
});

function animate(band) {
  requestAnimationFrame(() => animate(band));
  band.rotation.y += 0.003; // slow premium spin
  renderer.render(scene, camera);
}
