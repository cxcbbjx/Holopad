import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function playVoiceSkin(p) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = p === "self" ? "triangle" : "sine";
    o.frequency.value = p === "self" ? 420 : 340;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    const target = p === "self" ? 0.06 : 0.04;
    g.gain.exponentialRampToValueAtTime(target, ctx.currentTime + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    o.stop(ctx.currentTime + 0.85);
  } catch {}
}

export async function renderHologram({ image, modelUrl, overlayUrl, persona, onError, compareModelUrl, flipY, rot180, wow, alignX, alignY, zoom, stateRef, voxelDataRef, setDebugInfo, pointerRef }, mount) {
  mount.innerHTML = "";
  // designMeshes tracks ALL user-created objects (voxels, shapes, etc.) for interaction and export
  const designMeshes = [];
  
  const scene = new THREE.Scene();
  // scene.fog = new THREE.Fog(0x000000, 1.5, 6);

  const camera = new THREE.PerspectiveCamera(
    45,
    mount.clientWidth / mount.clientHeight,
    0.1,
    100
  );
  // Raised camera position for better 3D perspective (easier to see top faces)
  camera.position.set(0, 1.5, 2.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.zIndex = '2'; // Canvas on top
  mount.appendChild(renderer.domElement);

  // Background Video for AR Effect
  const hiddenVideo = document.createElement('video');
  hiddenVideo.style.position = 'absolute';
  hiddenVideo.style.top = '0';
  hiddenVideo.style.left = '0';
  hiddenVideo.style.width = '100%';
  hiddenVideo.style.height = '100%';
  hiddenVideo.style.objectFit = 'cover';
  hiddenVideo.style.zIndex = '1'; // Video behind canvas
  hiddenVideo.style.transform = 'scaleX(-1)'; // Mirror to match hand tracking
  hiddenVideo.style.display = 'none';
  hiddenVideo.setAttribute('playsinline', 'true');
  mount.appendChild(hiddenVideo);
  const videoRef = { current: hiddenVideo };

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.0;
  controls.enablePan = false;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
  mainLight.position.set(5, 10, 7);
  scene.add(mainLight);

  if (wow) {
    const backLight = new THREE.DirectionalLight(0x66ccff, 0.5);
    backLight.position.set(-2, 2.5, 1.5);
    scene.add(backLight);
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    const ctx2 = c.getContext('2d');
    ctx2.fillStyle = 'rgba(0,0,0,0)';
    ctx2.fillRect(0,0,1024,1024);
    ctx2.globalAlpha = 0.06;
    ctx2.fillStyle = '#ffffff';
    for (let y = 0; y < 1024; y += 6) ctx2.fillRect(0, y, 1024, 1);
    ctx2.globalAlpha = 1.0;
    const scanTex = new THREE.CanvasTexture(c);
    scanTex.colorSpace = THREE.SRGBColorSpace;
    const sGeom = new THREE.PlaneGeometry(6, 3.5);
    const sMat = new THREE.MeshBasicMaterial({ map: scanTex, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
    const scanPlane = new THREE.Mesh(sGeom, sMat);
    scanPlane.position.z = -0.2;
    scene.add(scanPlane);
  }

  let model, model2;
  if (modelUrl) {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync(modelUrl);
      model = gltf.scene;
      playVoiceSkin(persona || "neon");
      // center+fit and fix texture orientation
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      model.position.sub(center);
      const fov = camera.fov * (Math.PI / 180);
      const camZ = Math.abs((maxDim / 2) / Math.tan(fov / 2)) * 1.35;
      camera.position.set(0, 0, camZ);
      controls.target.set(0, 0, 0);
      controls.update();
      model.traverse((child) => {
        if (child.isMesh && child.material) {
          const keys = ['map','emissiveMap','roughnessMap','metalnessMap','normalMap'];
          for (const k of keys) {
            const t = child.material[k];
            if (t) {
              t.center.set(0.5, 0.5);
              const repX = 1 / zoom;
              const repY = (flipY ? -1 : 1) / zoom;
              t.repeat.set(repX, repY);
              t.rotation = rot180 ? Math.PI : 0;
              t.offset.x = 0.5 - (repX * 0.5) + alignX;
              t.offset.y = 0.5 - (repY * 0.5) + alignY;
              t.rotation = rot180 ? Math.PI : 0;
              t.needsUpdate = true;
            }
          }
        }
      });
      if (rot180) model.rotation.z = Math.PI;
      if (compareModelUrl) {
        try {
          const gltf2 = await loader.loadAsync(compareModelUrl);
          model2 = gltf2.scene;
          const box2 = new THREE.Box3().setFromObject(model2);
          const center2 = box2.getCenter(new THREE.Vector3());
          model2.position.sub(center2);
          model2.traverse((child) => {
            if (child.isMesh && child.material) {
              const keys = ['map','emissiveMap','roughnessMap','metalnessMap','normalMap'];
              for (const k of keys) {
                const t = child.material[k];
                if (t) {
                  t.center.set(0.5, 0.5);
                  const repX = 1 / zoom;
                  const repY = (flipY ? -1 : 1) / zoom;
                  t.repeat.set(repX, repY);
                  t.rotation = rot180 ? Math.PI : 0;
                  t.offset.x = 0.5 - (repX * 0.5) + alignX;
                  t.offset.y = 0.5 - (repY * 0.5) + alignY;
                  t.rotation = rot180 ? Math.PI : 0;
                  t.needsUpdate = true;
                }
              }
            }
          });
          if (rot180) model2.rotation.z = Math.PI;
        } catch {}
      }
      if (compareModelUrl && model2) {
        model.position.x = -0.7;
        model2.position.x = 0.7;
        scene.add(model);
        scene.add(model2);
      } else {
        scene.add(model);
      }
    } catch (e) {
      console.error("GLB load failed", e);
      if (onError) onError("Model load failed");
    }
  }

  if (!model && image) {
    const textureURL = URL.createObjectURL(image);
    const texture = new THREE.TextureLoader().load(textureURL);
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.center.set(0.5, 0.5);
    const repX = 1 / zoom;
    const repY = (flipY ? -1 : 1) / zoom;
    texture.repeat.set(repX, repY);
    texture.rotation = rot180 ? Math.PI : 0;
    texture.offset.x = 0.5 - (repX * 0.5) + alignX;
    texture.offset.y = 0.5 - (repY * 0.5) + alignY;
    texture.needsUpdate = true;
    const iw = texture.image?.width || 1024;
    const ih = texture.image?.height || 1024;
    const ar = iw / ih;
    const geometry = new THREE.PlaneGeometry(1.2, 1.2 / ar);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      emissive: new THREE.Color(0x6EC1FF),
      emissiveIntensity: 0.9,
      metalness: 0.6,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    model = new THREE.Mesh(geometry, material);
    if (rot180) model.rotation.z = Math.PI;
    scene.add(model);
    playVoiceSkin(persona || "neon");
  }

  // Overlay glow plane (if provided)
  if (overlayUrl) {
    const olTex = await new Promise((resolve) => {
      new THREE.TextureLoader().load(overlayUrl, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.center.set(0.5, 0.5);
        const repX = 1 / zoom;
        const repY = (flipY ? -1 : 1) / zoom;
        t.repeat.set(repX, repY);
        t.rotation = rot180 ? Math.PI : 0;
        t.offset.x = 0.5 - (repX * 0.5) + alignX;
        t.offset.y = 0.5 - (repY * 0.5) + alignY;
        t.needsUpdate = true;
        resolve(t);
      }, undefined, () => resolve(null));
    });
    if (olTex) {
      let w = 1.3, h = 1.3;
      if (model) {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        w = Math.max(1.0, size.x * 1.05);
        h = Math.max(1.0, size.y * 1.05);
      }
      const oGeom = new THREE.PlaneGeometry(w, h);
      const oMat = new THREE.MeshBasicMaterial({
        map: olTex,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const overlayPlane = new THREE.Mesh(oGeom, oMat);
      overlayPlane.position.z = 0.001;
      scene.add(overlayPlane);
    }
  }
  if (wow) {
    const pCount = 400;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const r = 1.4 + Math.random() * 0.6;
      const a = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x66ccff, size: 0.02, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geom, mat);
    scene.add(points);
  }
  let raf;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  // Increased floor size for better raycasting coverage
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({ visible: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.6;
  scene.add(floor);

  // Vertical Wall for "Air Drawing" (at Z=0)
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({ visible: false }));
  wall.position.z = 0;
  scene.add(wall);

  const objects = [floor, wall];

  // Visual Cursor for Hand Tracking
  const cursorGeo = new THREE.SphereGeometry(0.05, 16, 16);
  const cursorMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8, depthTest: false });
  const handCursor = new THREE.Mesh(cursorGeo, cursorMat);
  handCursor.visible = false;
  scene.add(handCursor);

  const grid = new THREE.GridHelper(10, 20, 0x335577, 0x223344);
  grid.position.y = -0.6;
  scene.add(grid);

  const rollOverGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const rollOverMaterial = new THREE.MeshBasicMaterial({ color: 0x4488ff, opacity: 0.5, transparent: true, depthTest: false, side: THREE.DoubleSide });
  const rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
  const rollOverEdges = new THREE.LineSegments(new THREE.EdgesGeometry(rollOverGeo), new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.5 }));
  rollOverMesh.add(rollOverEdges);
  rollOverMesh.visible = false;
  scene.add(rollOverMesh);
  
  const voxelGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const voxelEdgesGeo = new THREE.EdgesGeometry(voxelGeo);
  // Pure white opaque material for "Blueprint" look
  const voxelMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  // Deep Blue distinct edges
  const voxelEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x0044aa, linewidth: 2 });

  // Restore existing voxels
  if (voxelDataRef && voxelDataRef.current) {
    voxelDataRef.current.forEach(pos => {
      const voxel = new THREE.Mesh(voxelGeo, voxelMaterial);
      const edges = new THREE.LineSegments(voxelEdgesGeo, voxelEdgeMaterial);
      voxel.add(edges);
      voxel.position.copy(pos);
      scene.add(voxel);
      objects.push(voxel);
      designMeshes.push(voxel);
    });
  }

  function placeAtPointer(overrideTool = null) {
    const { tool } = stateRef?.current || {};
    const currentTool = overrideTool || tool;
    
    if (currentTool === "voxel") {
      if (rollOverMesh.visible) {
        // Prevent duplicate placement
        const pos = rollOverMesh.position;
        const exists = voxelDataRef.current.some(v => v.equals(pos));
        if (exists) return;

        const voxel = new THREE.Mesh(voxelGeo, voxelMaterial);
        const edges = new THREE.LineSegments(voxelEdgesGeo, voxelEdgeMaterial);
        voxel.add(edges);
        voxel.position.copy(pos);
        scene.add(voxel);
        objects.push(voxel);
        designMeshes.push(voxel);
        if (voxelDataRef) voxelDataRef.current.push(voxel.position.clone());
      }
      return;
    }

    raycaster.setFromCamera(mouse, camera);
    // Minecraft-Style: Only interact with Floor and Existing Objects
    const interactables = [floor, ...designMeshes];
    const hits = raycaster.intersectObjects(interactables, false);
    
    let p;
    if (hits.length) {
      p = hits[0].point;
    } else {
      p = new THREE.Vector3();
      raycaster.ray.at(3, p); // Air placement default
    }
      // If hitting a voxel, we might want to place ON it (normal) - Logic handled by tool specific code if needed
      // But for simple shapes, center on point is default behavior in this prototype
      
      let m;
      if (currentTool === "cube") {
        const geom = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const mat = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: new THREE.Color(0x113355), roughness: 0.3, metalness: 0.2 });
        m = new THREE.Mesh(geom, mat);
        m.position.copy(p);
        scene.add(m);
      } else if (currentTool === "sphere") {
        const geom = new THREE.SphereGeometry(0.28, 24, 24);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff66aa, emissive: new THREE.Color(0x331122), roughness: 0.25, metalness: 0.3 });
        m = new THREE.Mesh(geom, mat);
        m.position.copy(p);
        scene.add(m);
      } else if (currentTool === "pyramid") {
        const geom = new THREE.ConeGeometry(0.3, 0.5, 4);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: new THREE.Color(0x553300), roughness: 0.3 });
        m = new THREE.Mesh(geom, mat);
        m.position.copy(p);
        m.position.y += 0.25; // Sit on floor
        scene.add(m);
      } else if (currentTool === "model") {
        const loader = new GLTFLoader();
        loader.load("http://localhost:5000/public/head_template.glb", (gltf) => {
          const mModel = gltf.scene;
          mModel.position.copy(p);
          mModel.scale.set(0.25, 0.25, 0.25);
          scene.add(mModel);
          designMeshes.push(mModel);
          objects.push(mModel);
        });
      }
      
      if (m) {
        designMeshes.push(m);
        objects.push(m);
      }
    // End of placement logic
  }
  const brushGeom = new THREE.BufferGeometry();
  const brushPositions = [];
  const brushMat = new THREE.LineBasicMaterial({ color: 0x6EC1FF, linewidth: 2 });
  let brushLine = null;
  function updateBrush() {
    if (!brushLine) {
      brushLine = new THREE.Line(brushGeom, brushMat);
      scene.add(brushLine);
    }
    brushGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(brushPositions.flat()), 3));
    brushGeom.computeBoundingSphere();
  }
  function brushAtPointer() {
    raycaster.setFromCamera(mouse, camera);
    const interactables = [floor, ...designMeshes];
    const hits = raycaster.intersectObjects(interactables, false);
    
    let p;
    if (hits.length) {
      p = hits[0].point;
    } else {
      p = new THREE.Vector3();
      raycaster.ray.at(3, p);
    }
    
    brushPositions.push([p.x, p.y + 0.01, p.z]);
    if (brushPositions.length % 4 === 0) updateBrush();
  }
  renderer.domElement.addEventListener('mousemove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    updateRollOver();

    const { creative, brushActive, tool } = stateRef?.current || {};
    if (creative && brushActive && tool === "brush") brushAtPointer();
  });

  function updateRollOver() {
    const { tool, creative } = stateRef?.current || {};
    if (creative && tool === "voxel") {
      raycaster.setFromCamera(mouse, camera);
      
      // 1. Prioritize hitting existing design meshes (voxels, spheres, etc.)
      const meshIntersects = raycaster.intersectObjects(designMeshes, false);
      if (meshIntersects.length > 0) {
        const intersect = meshIntersects[0];
        rollOverMesh.visible = true;
        rollOverMesh.position.copy(intersect.point).add(intersect.face.normal.multiplyScalar(0.25));
        rollOverMesh.position.divideScalar(0.5).floor().multiplyScalar(0.5).addScalar(0.25);
        return;
      }

      // 2. "Bridge Building" - Check proximity to existing voxels if we missed them
      // This allows drawing off the side of a voxel even if the face isn't visible
      let closestDist = Infinity;
      let closestVoxel = null;
      const ray = raycaster.ray;
      
      // Optimization: Only check if we have voxels
      if (voxelDataRef.current.length > 0) {
         for (const vPos of voxelDataRef.current) {
            // Check distance from Ray to Voxel Center
            const dist = ray.distanceSqToPoint(vPos);
            // Threshold: 0.5 unit radius (squared is 0.25) - allows slight miss
            if (dist < 0.25 && dist < closestDist) {
               closestDist = dist;
               closestVoxel = vPos;
            }
         }
      }

      if (closestVoxel) {
         // We missed the mesh but are close to a voxel -> snap to nearest face
         // Project center onto ray to find where we are "pointing" relative to center
         const closestPointOnRay = new THREE.Vector3();
         ray.closestPointToPoint(closestVoxel, closestPointOnRay);
         
         const diff = closestPointOnRay.sub(closestVoxel);
         // Find dominant axis
         const absX = Math.abs(diff.x);
         const absY = Math.abs(diff.y);
         const absZ = Math.abs(diff.z);
         
         const normal = new THREE.Vector3();
         if (absX >= absY && absX >= absZ) normal.set(Math.sign(diff.x), 0, 0);
         else if (absY >= absX && absY >= absZ) normal.set(0, Math.sign(diff.y), 0);
         else normal.set(0, 0, Math.sign(diff.z));

         rollOverMesh.visible = true;
         rollOverMesh.position.copy(closestVoxel).add(normal.multiplyScalar(0.5));
         return;
      }

      // 3. Fallback to Floor (No Wall)
      const intersects = raycaster.intersectObjects([floor], false);
      if (intersects.length > 0) {
        const intersect = intersects[0];
        rollOverMesh.visible = true;
        rollOverMesh.position.copy(intersect.point).add(intersect.face.normal.multiplyScalar(0.25));
        rollOverMesh.position.divideScalar(0.5).floor().multiplyScalar(0.5).addScalar(0.25);
      } else {
         // Air Drawing Fallback: Place at fixed distance (3 units)
         const distance = 3;
         const point = new THREE.Vector3();
         raycaster.ray.at(distance, point);
         
         rollOverMesh.visible = true;
         rollOverMesh.position.copy(point);
         rollOverMesh.position.divideScalar(0.5).floor().multiplyScalar(0.5).addScalar(0.25);
      }
    } else {
      rollOverMesh.visible = false;
    }
  }

  renderer.domElement.addEventListener('click', () => {
    const { creative } = stateRef?.current || {};
    if (creative) placeAtPointer();
  });
  let handsLoopId;
  let videoStream = null;
  let handsInstance = null;
  let isWebcamActive = false;
  let lastPlacementTime = 0; // Moved outside the loop for persistence
  let lastPlacementPos = new THREE.Vector3(Infinity, Infinity, Infinity); // Track last placement for drag-drawing
  let isPinchingState = false; // Persistent state for pinch hysteresis

  async function loadHands() {
    if (window.Hands) return;
    const s1 = document.createElement('script');
    s1.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js';
    const s2 = document.createElement('script');
    s2.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
    await new Promise((r) => { s1.onload = r; document.body.appendChild(s1); });
    await new Promise((r) => { s2.onload = r; document.body.appendChild(s2); });
  }

  async function startWebcam() {
    if (isWebcamActive) return;
    try {
      setDebugInfo("Loading Hand Model...");
      await loadHands();
      setDebugInfo("Requesting Camera...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      videoStream = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      
      // Enable AR Mode: Show video background and make scene transparent
      videoRef.current.style.display = 'block';
      scene.background = null; 

      setDebugInfo("Initializing Detector...");
      handsInstance = new window.Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${f}` });
      handsInstance.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      
      handsInstance.onResults((res) => {
        if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
          const lm = res.multiHandLandmarks[0];
          const { creative, brushActive, tool } = stateRef?.current || {};
          
          // Debug Stats
          const x = lm[8].x;
          const y = lm[8].y;
          
          // Move 2D Debug Pointer
          if (pointerRef && pointerRef.current) {
            pointerRef.current.style.display = 'block';
            pointerRef.current.style.left = `${(1 - x) * 100}%`;
            pointerRef.current.style.top = `${y * 100}%`;
          }

          // Mirror x for natural feel
          const targetX = (1 - x) * 2 - 1; 
          const targetY = -(y * 2 - 1);
          
          // Adaptive Smoothing (Smart Filter)
          // Calculate speed of movement
          const deltaMove = Math.sqrt(Math.pow(targetX - mouse.x, 2) + Math.pow(targetY - mouse.y, 2));
          // If moving fast (>0.05 per frame), be responsive (alpha 0.5)
          // If moving slow (precision work), be smooth (alpha 0.1)
          const alpha = deltaMove > 0.05 ? 0.5 : 0.1;
          
          mouse.x = mouse.x * (1 - alpha) + targetX * alpha;
          mouse.y = mouse.y * (1 - alpha) + targetY * alpha;
          
          updateRollOver();

          // Update Visual Cursor
          raycaster.setFromCamera(mouse, camera);
          // Intersect with floor and design meshes (Surface Snapping)
          const cursorHits = raycaster.intersectObjects([floor, ...designMeshes], false);
          if (cursorHits.length > 0) {
            handCursor.position.copy(cursorHits[0].point);
          } else {
             // Air Cursor Fallback
             const point = new THREE.Vector3();
             raycaster.ray.at(3, point); // Same distance as rollOver
             handCursor.position.copy(point);
          }
          handCursor.visible = creative; // Only show in creative mode
            
            // Add a ring helper for better depth perception
            if (!handCursor.userData.ring) {
                const ringGeo = new THREE.RingGeometry(0.08, 0.1, 32);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                handCursor.add(ring);
                handCursor.userData.ring = ring;
            }
            if (handCursor.userData.ring) {
                handCursor.userData.ring.lookAt(camera.position);
            }
          
          // Pinch Detection (Thumb tip 4, Index tip 8)
          const thumb = lm[4];
          const index = lm[8];
          const dist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));
          
          // Pinch Hysteresis (Schmitt Trigger)
          // Enter pinch at < 0.05, Exit pinch at > 0.08
          if (isPinchingState) {
             if (dist > 0.08) isPinchingState = false;
          } else {
             if (dist < 0.05) isPinchingState = true;
          }

          // Normalized Pinch Strength for UI
          const pinchStrength = Math.max(0, Math.min(1, (0.15 - dist) / (0.15 - 0.05)));

          setDebugInfo(`Hands detected: 1\nPinch Strength: ${(pinchStrength * 100).toFixed(0)}%\nState: ${creative ? 'Creative' : 'View'}`);

          if (isPinchingState) {
            if (pointerRef && pointerRef.current) pointerRef.current.style.borderColor = '#00ff00';
            
            handCursor.material.color.setHex(0x00ff00); // Green when pinching
            if (handCursor.userData.ring) handCursor.userData.ring.material.color.setHex(0x00ff00);
            handCursor.scale.set(1.2, 1.2, 1.2);
            
            if (creative) {
              if (tool === "brush" && brushActive) {
                brushAtPointer();
              } else {
                // Drag-to-Spawn Logic: "Follow me" effect
                if (rollOverMesh.visible) {
                    const dist = lastPlacementPos.distanceTo(rollOverMesh.position);
                    if (dist >= 0.45) {
                        placeAtPointer();
                        lastPlacementPos.copy(rollOverMesh.position);
                    }
                }
              }
            }
          } else {
            lastPlacementPos.set(Infinity, Infinity, Infinity);
            if (pointerRef && pointerRef.current) pointerRef.current.style.borderColor = 'yellow';
            
            handCursor.material.color.setHex(0xffff00); // Yellow when idle
            if (handCursor.userData.ring) handCursor.userData.ring.material.color.setHex(0xffff00);
            handCursor.scale.set(1.0, 1.0, 1.0);
          }
        } else {
          setDebugInfo("Hands detected: 0");
          handCursor.visible = false;
          if (pointerRef && pointerRef.current) pointerRef.current.style.display = 'none';
        }
      });

      isWebcamActive = true;
      async function loop() {
        if (!isWebcamActive) return;
        if (videoRef.current && videoRef.current.readyState >= 2) {
          await handsInstance.send({ image: videoRef.current });
        }
        handsLoopId = requestAnimationFrame(loop);
      }
      loop();
    } catch (e) {
      console.error("Webcam init failed", e);
      setDebugInfo(`Error: ${e.message}`);
      isWebcamActive = false;
    }
  }

  function stopWebcam() {
    isWebcamActive = false;
    if (handsLoopId) cancelAnimationFrame(handsLoopId);
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
    if (videoRef.current) {
        videoRef.current.style.display = 'none';
        scene.background = new THREE.Color(0x000000); // Restore black background
    }
    if (handsInstance) {
      handsInstance.close();
      handsInstance = null;
    }
  }

  function animate() {
    const { creative } = stateRef?.current || {};
    if (controls) {
        controls.autoRotate = !creative;
        controls.update();
    }

    if (model) {
      model.rotation.y += 0.002;
      model.position.y = Math.sin(Date.now() * 0.002) * 0.04;
    }
    if (model2) {
      model2.rotation.y -= 0.0018;
      model2.position.y = Math.sin(Date.now() * 0.002 + 0.8) * 0.04;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }
  animate();

  const handleResize = () => {
    camera.aspect = mount.clientWidth / mount.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mount.clientWidth, mount.clientHeight);
  };
  window.addEventListener('resize', handleResize);

  const clearVoxels = () => {
    designMeshes.forEach(v => {
      scene.remove(v);
      const i = objects.indexOf(v);
      if (i > -1) objects.splice(i, 1);
    });
    designMeshes.length = 0;
    // Also clear persistence for voxels
    if (voxelDataRef) voxelDataRef.current = [];
  };

  const exportVoxels = () => {
    if (designMeshes.length === 0) return;
    const exporter = new OBJExporter();
    const group = new THREE.Group();
    designMeshes.forEach(mesh => {
      group.add(mesh.clone());
    });
    const result = exporter.parse(group);
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'holopad-design.obj';
    link.click();
    URL.revokeObjectURL(url);
  };

  let recognition = null;
  const setupVoiceControl = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setDebugInfo("Voice not supported");
      return null;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'hi-IN'; // Default to Hindi/English mix

    recognition.onstart = () => {
        setDebugInfo("🎤 Listening... (Speak 'Box', 'Gola', 'Clear')");
    };

    recognition.onend = () => {
        setDebugInfo("Voice Stopped (Click Mic to restart)");
    };

    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();
      setDebugInfo(`🎤 Heard: "${transcript}"`);

      if (transcript.includes('box') || transcript.includes('cube') || transcript.includes('dabba')) {
        placeAtPointer('cube');
      } else if (transcript.includes('sphere') || transcript.includes('ball') || transcript.includes('gola')) {
        placeAtPointer('sphere');
      } else if (transcript.includes('pyramid') || transcript.includes('triangle')) {
        placeAtPointer('pyramid');
      } else if (transcript.includes('voxel') || transcript.includes('block')) {
        placeAtPointer('voxel');
      } else if (transcript.includes('clear') || transcript.includes('saaf') || transcript.includes('remove')) {
        clearVoxels();
      }
    };

    recognition.onerror = (event) => {
         // Map specific error codes to user-friendly messages
         const errorMap = {
             'no-speech': 'No speech detected. Try again.',
             'audio-capture': 'No microphone found.',
             'not-allowed': 'Microphone permission denied.',
             'network': 'Network error. Check connection.',
             'aborted': 'Listening stopped.'
         };
         
         const msg = errorMap[event.error] || event.error;
         console.warn("Voice warning/error:", event.error);
         
         // Don't overwrite "Listening..." with "aborted" if we just toggled it off intentionally
         if (event.error !== 'aborted') {
             setDebugInfo(`⚠️ Voice: ${msg}`);
         }
    };

    return recognition;
  };

  // Don't start automatically, wait for user
  setupVoiceControl();

  return {
    dispose: () => {
      if (recognition) {
          recognition.onend = null; // Prevent loops
          recognition.stop();
      }
      stopWebcam();
      cancelAnimationFrame(raf);
      renderer.dispose();
      mount.innerHTML = "";
      window.removeEventListener('resize', handleResize);
    },
    toggleVoice: () => {
        if (!recognition) {
            setupVoiceControl();
        }
        if (recognition) {
            try {
                recognition.start();
                setDebugInfo("🎤 Starting Voice...");
            } catch (e) {
                // If already started (or other error), stop it
                recognition.stop();
                setDebugInfo("🛑 Voice Stopping...");
            }
        }
    },
    clearVoxels,
    exportVoxels,
    takeScreenshot: () => {
      const canvas = document.createElement("canvas");
      canvas.width = mount.clientWidth;
      canvas.height = mount.clientHeight;
      const ctx = canvas.getContext("2d");

      // 1. Draw Video (if AR active and visible)
      if (isWebcamActive && videoRef.current && videoRef.current.style.display !== 'none') {
          ctx.save();
          ctx.scale(-1, 1); // Mirror video
          ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();
      } else {
          // If not AR, fill with black (or scene background if set, but scene.background is null in AR)
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Draw WebGL Scene
      renderer.render(scene, camera);
      ctx.drawImage(renderer.domElement, 0, 0);

      // 3. Download
      const link = document.createElement('a');
      link.download = `holopad-snap-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    },
    setWebcam: (enable) => {
      if (enable) startWebcam();
      else stopWebcam();
    }
  };
}
