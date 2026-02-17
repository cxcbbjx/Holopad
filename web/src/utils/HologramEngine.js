import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { HandController } from './HandController';

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

export async function renderHologram({ image, modelUrl, overlayUrl, persona, onError, compareModelUrl, flipY, rot180, wow, alignX, alignY, zoom, stateRef, voxelDataRef, setDebugInfo, pointerRef, onVoiceStateChange, onStatsChange, onZoomChange }, mount) {
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
  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0x050510, 1); // Stark Dark Blue
  mount.appendChild(renderer.domElement);

  // Stark Environment: Fog
  scene.fog = new THREE.FogExp2(0x050510, 0.02);

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

  // Add a bright light behind the model to catch the 3D edges (Rim Light)
  const rimLight = new THREE.DirectionalLight(0xffffff, 2.5);
  rimLight.position.set(0, 5, -5); // Positioned behind and above
  scene.add(rimLight);

  // Add a subtle fill light from the front
  const frontLight = new THREE.PointLight(0x00ffff, 1.5); // Neon cyan for that holo-vibe
  frontLight.position.set(2, 2, 5);
  scene.add(frontLight);

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

  // Holographic Material Shader
  const holographicMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#00f0ff') },
      uTexture: { value: null } // To be set later
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform sampler2D uTexture;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        // Basic Texture Color
        vec4 texColor = texture2D(uTexture, vUv);
        
        // Scanlines
        float scanline = sin(vUv.y * 200.0 + uTime * 5.0) * 0.05;
        
        // Fresnel Effect (Rim Light)
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - dot(normal, viewDir), 3.0);
        
        // Pulse Effect
        float pulse = (sin(uTime * 2.0) + 1.0) * 0.1;

        vec3 finalColor = texColor.rgb + uColor * (fresnel + scanline + pulse);
        float alpha = texColor.a * (0.8 + fresnel); // Make edges glow more opaque

        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });

  let model, model2;
  if (modelUrl) {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    dracoLoader.setDecoderConfig({ type: 'js' }); // Use JS for compatibility
    loader.setDRACOLoader(dracoLoader);
    
    try {
      const gltf = await loader.loadAsync(modelUrl);
      model = gltf.scene;
      playVoiceSkin(persona || "neon");
      
      // Apply Holographic Shader to Meshes
      model.traverse((child) => {
        if (child.isMesh) {
          if (child.material.map) {
             // Clone the shader to keep unique textures
             const mat = holographicMaterial.clone();
             mat.uniforms.uTexture.value = child.material.map;
             child.material = mat;
          }
          child.castShadow = true;
          child.receiveShadow = true;

          // Cache original positions for warping
          if (child.geometry) {
             const pos = child.geometry.attributes.position;
             child.userData.originalPosition = pos.clone();
             
             // Identify regions (approximate based on standard face mesh)
             const mouth = [];
             const brow = [];
             for(let i=0; i<pos.count; i++) {
                 const x = pos.getX(i);
                 const y = pos.getY(i);
                 // Mouth: Lower center
                 if (Math.abs(x) < 0.15 && y < -0.05 && y > -0.25) mouth.push(i);
                 // Brow: Upper center
                 if (Math.abs(x) < 0.2 && y > 0.05 && y < 0.2) brow.push(i);
             }
             child.userData.mouthIndices = mouth;
             child.userData.browIndices = brow;
          }
        }
      });

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
          if (child.material.uniforms && child.material.uniforms.uTexture) {
             // For shader material, we modify the texture itself if needed, or uniforms
             // But for now let's assume UVs are correct from process_image_to_glb
          }
        }
      });
      if (rot180) model.rotation.z = Math.PI;
      if (compareModelUrl) {
        try {
          const gltf2 = await loader.loadAsync(compareModelUrl);
          model2 = gltf2.scene;
          
          // Apply Holographic Shader to Model 2
          model2.traverse((child) => {
            if (child.isMesh) {
              if (child.material.map) {
                 const mat = holographicMaterial.clone();
                 mat.uniforms.uTexture.value = child.material.map;
                 child.material = mat;
              }
            }
          });

          const box2 = new THREE.Box3().setFromObject(model2);
          const center2 = box2.getCenter(new THREE.Vector3());
          model2.position.sub(center2);
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
      console.error("HologramEngine: GLB load failed", e);
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
    // Stark Particle System: "Data Motes"
    const pCount = 800;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ 
        color: 0x00aaff, 
        size: 0.03, 
        transparent: true, 
        opacity: 0.4, 
        blending: THREE.AdditiveBlending 
    });
    const points = new THREE.Points(geom, mat);
    scene.add(points);

    // Stark Grid System
    const gridHelper = new THREE.GridHelper(20, 40, 0x00f0ff, 0x004466);
    gridHelper.position.y = -0.6;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    scene.add(gridHelper);

    const polarGrid = new THREE.PolarGridHelper(8, 16, 8, 64, 0x00f0ff, 0x00f0ff);
    polarGrid.position.y = -0.61;
    polarGrid.material.transparent = true;
    polarGrid.material.opacity = 0.15;
    scene.add(polarGrid);
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

  // Project Valuation Logic
  function updateStats() {
    // Base value + (Voxels * 15) + (Models * 100)
    const voxelCount = voxelDataRef.current.length;
    const modelCount = designMeshes.filter(m => !m.userData.isVoxel).length;
    const value = 50 + (voxelCount * 15) + (modelCount * 100);
    
    // Notify UI
    if (onStatsChange) {
      onStatsChange({ count: voxelCount + modelCount, value });
    }
  }

  // --- ACTIONS ---
  
  function undo() {
    if (designMeshes.length === 0) return;
    const last = designMeshes.pop();
    scene.remove(last);
    
    // Also remove from objects array to keep raycasting clean
    const idx = objects.indexOf(last);
    if (idx > -1) objects.splice(idx, 1);

    // If it was a voxel, remove from voxelDataRef
    if (last.userData.isVoxel) {
      // Find matching position in voxelDataRef (a bit expensive but safe)
      const vIdx = voxelDataRef.current.findIndex(v => v.equals(last.position));
      if (vIdx > -1) voxelDataRef.current.splice(vIdx, 1);
    }
    updateStats();
  }

  function clearVoxels() {
    // Remove all design meshes
    designMeshes.forEach(m => scene.remove(m));
    
    // Clear arrays
    designMeshes.length = 0;
    voxelDataRef.current = [];
    
    // Clean up objects array (keep floor and wall)
    // Filter out anything that isn't floor or wall
    const keep = [floor, wall];
    objects.length = 0;
    objects.push(...keep);
    updateStats();
  }

  function exportVoxels() {
    const exporter = new OBJExporter();
    // Export only the design meshes, not the floor/grid/helpers
    const group = new THREE.Group();
    designMeshes.forEach(m => group.add(m.clone()));
    
    const result = exporter.parse(group);
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `holopad-project-${Date.now()}.obj`;
    link.click();
    URL.revokeObjectURL(url);
  }

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

  // Smart Placement Helper
  function getSmartPlacement(tool, mouse) {
    raycaster.setFromCamera(mouse, camera);
    const { smartStack } = stateRef?.current || { smartStack: true };
    
    // 1. Check existing design meshes and floor
    const interactables = [floor, ...designMeshes];
    const hits = raycaster.intersectObjects(interactables, false);
    
    if (hits.length > 0) {
      const hit = hits[0];
      const normal = hit.face?.normal?.clone().normalize() || new THREE.Vector3(0, 1, 0);
      const point = hit.point.clone();
      let finalPos = point.clone();

      if (tool === "voxel") {
        finalPos.add(normal.multiplyScalar(0.25));
        finalPos.divideScalar(0.5).floor().multiplyScalar(0.5).addScalar(0.25);
        return { pos: finalPos, valid: true, hitMesh: hit.object };
      } else if (tool === "cube") {
        // Smart Stacking: Offset by half-size (0.2) to sit perfectly on top
        if (smartStack) finalPos.add(normal.multiplyScalar(0.2));
        return { pos: finalPos, valid: true, hitMesh: hit.object };
      } else if (tool === "sphere") {
        // Smart Stacking: Offset by radius (0.28)
        if (smartStack) finalPos.add(normal.multiplyScalar(0.28));
        return { pos: finalPos, valid: true, hitMesh: hit.object };
      } else if (tool === "pyramid") {
        if (smartStack) finalPos.add(normal.multiplyScalar(0.25));
        return { pos: finalPos, valid: true, hitMesh: hit.object };
      } else if (tool === "model") {
        return { pos: point, valid: true, hitMesh: hit.object };
      }
    }
    
    // 2. Voxel-Specific "Bridge Building" (Proximity Snap)
    // Only if we missed meshes but are near a voxel
    if (tool === "voxel" && voxelDataRef.current.length > 0) {
       const ray = raycaster.ray;
       let closestDist = Infinity;
       let closestVoxel = null;
       
       for (const vPos of voxelDataRef.current) {
          const dist = ray.distanceSqToPoint(vPos);
          if (dist < 0.25 && dist < closestDist) {
             closestDist = dist;
             closestVoxel = vPos;
          }
       }

       if (closestVoxel) {
         const closestPointOnRay = new THREE.Vector3();
         ray.closestPointToPoint(closestVoxel, closestPointOnRay);
         const diff = closestPointOnRay.sub(closestVoxel);
         const absX = Math.abs(diff.x);
         const absY = Math.abs(diff.y);
         const absZ = Math.abs(diff.z);
         const normal = new THREE.Vector3();
         if (absX >= absY && absX >= absZ) normal.set(Math.sign(diff.x), 0, 0);
         else if (absY >= absX && absY >= absZ) normal.set(0, Math.sign(diff.y), 0);
         else normal.set(0, 0, Math.sign(diff.z));

         const finalPos = closestVoxel.clone().add(normal.multiplyScalar(0.5));
         return { pos: finalPos, valid: true, hitMesh: null };
       }
    }

    // 3. Air Fallback (if no hit)
    const point = new THREE.Vector3();
    raycaster.ray.at(3, point);
    if (tool === "voxel") {
        point.divideScalar(0.5).floor().multiplyScalar(0.5).addScalar(0.25);
    }
    return { pos: point, valid: true, hitMesh: null };
  }

  function placeAtPointer(overrideTool = null) {
    const { tool, mirrorX, mirrorZ } = stateRef?.current || {};
    const currentTool = overrideTool || tool;
    
    // Use Smart Placement logic
    const placement = getSmartPlacement(currentTool, mouse);
    if (!placement.valid) return;

    const p = placement.pos;

    // Helper to actually create the mesh
    const createMesh = (position) => {
      let m;
      if (currentTool === "voxel") {
        // Check for duplicates at this position
        if (voxelDataRef.current.some(v => v.distanceTo(position) < 0.1)) return null;
        
        const voxel = new THREE.Mesh(voxelGeo, voxelMaterial);
        const edges = new THREE.LineSegments(voxelEdgesGeo, voxelEdgeMaterial);
        voxel.add(edges);
        voxel.position.copy(position);
        voxel.userData.isVoxel = true;
        scene.add(voxel);
        if (voxelDataRef) voxelDataRef.current.push(voxel.position.clone());
        updateStats();
        return voxel;
      } else if (currentTool === "cube") {
        const geom = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const mat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.2, metalness: 0.8 });
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom), new THREE.LineBasicMaterial({ color: 0x00ffff }));
        m = new THREE.Mesh(geom, mat);
        m.add(edges);
        m.position.copy(position);
        scene.add(m);
        updateStats();
        return m;
      } else if (currentTool === "sphere") {
        const geom = new THREE.SphereGeometry(0.28, 24, 24);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff3366, roughness: 0.2, metalness: 0.8 });
        m = new THREE.Mesh(geom, mat);
        m.position.copy(position);
        scene.add(m);
        updateStats();
        return m;
      } else if (currentTool === "pyramid") {
        const geom = new THREE.ConeGeometry(0.28, 0.5, 4);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.2, metalness: 0.8 });
        m = new THREE.Mesh(geom, mat);
        m.position.copy(position);
        m.rotation.y = Math.PI / 4;
        scene.add(m);
        updateStats();
        return m;
      }
      return null;
    };

    if (currentTool === "model") {
        const loader = new GLTFLoader();
        // Model placement logic (keep existing mostly, but use p)
        const positions = [p.clone()];
        if (mirrorX) positions.push(new THREE.Vector3(-p.x, p.y, p.z));
        if (mirrorZ) positions.push(new THREE.Vector3(p.x, p.y, -p.z));
        if (mirrorX && mirrorZ) positions.push(new THREE.Vector3(-p.x, p.y, -p.z));

        // Use relative path via proxy
        loader.load("/public/head_template.glb", (gltf) => {
            positions.forEach(pos => {
                const mModel = gltf.scene.clone();
                mModel.position.copy(pos);
                mModel.scale.set(0.25, 0.25, 0.25);
                scene.add(mModel);
                designMeshes.push(mModel);
                objects.push(mModel);
            });
            updateStats();
        });
        return;
    }

    // Symmetry Logic
    const positions = [p.clone()];
    if (mirrorX) positions.push(new THREE.Vector3(-p.x, p.y, p.z));
    if (mirrorZ) positions.push(new THREE.Vector3(p.x, p.y, -p.z));
    if (mirrorX && mirrorZ) positions.push(new THREE.Vector3(-p.x, p.y, -p.z));

    // Filter unique positions for voxels (snap grid can cause overlap on axes)
    const uniquePos = [];
    positions.forEach(pos => {
       if (!uniquePos.some(u => u.distanceTo(pos) < 0.1)) uniquePos.push(pos);
    });

    uniquePos.forEach(pos => {
       const mesh = createMesh(pos);
       if (mesh) {
         if (currentTool === "pyramid") mesh.position.y += 0.25;
         designMeshes.push(mesh);
         objects.push(mesh);
       }
    });
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
    
    // Support visual cursor for all placement tools
    if (creative && (tool === "voxel" || tool === "cube" || tool === "sphere")) {
        const res = getSmartPlacement(tool, mouse);
        
        if (res.valid) {
            rollOverMesh.visible = true;
            rollOverMesh.position.copy(res.pos);
            
            // Adjust Cursor Size & Color
            if (tool === "voxel") {
                rollOverMesh.scale.set(1, 1, 1); // 0.5 box
                rollOverMesh.material.color.setHex(0x4488ff);
            } else if (tool === "cube") {
                rollOverMesh.scale.set(0.8, 0.8, 0.8); // 0.4 box
                rollOverMesh.material.color.setHex(0x00f0ff);
            } else if (tool === "sphere") {
                rollOverMesh.scale.set(1.12, 1.12, 1.12); // ~0.56 diameter
                rollOverMesh.material.color.setHex(0xff3366);
            }
        } else {
             rollOverMesh.visible = false;
        }
    } else {
        rollOverMesh.visible = false;
    }
  }

  renderer.domElement.addEventListener('click', () => {
    const { creative } = stateRef?.current || {};
    if (creative) placeAtPointer();
  });

  let handController = null;
  let isWebcamActive = false;
  let lastPlacementPos = new THREE.Vector3(Infinity, Infinity, Infinity);
  let isPinchingState = false;
  let lastScaleDist = -1;
  let grabbedObject = null;
  let lastDeleteTime = 0;

  async function startWebcam() {
    if (isWebcamActive) return;
    try {
      setDebugInfo("Initializing Hand Controller...");
      
      // AR Mode Setup
      videoRef.current.style.display = 'block';
      scene.background = null;
      isWebcamActive = true;

      handController = new HandController(videoRef.current, (data) => {
        const { creative, brushActive, tool } = stateRef?.current || {};
        
        if (data.hands.length > 0) {
            const { center, gesture, pinchDistance, scaleDistance } = data;
            
            // 1. Move Cursor (Index Tip)
            // Mirror X
            const x = center.x;
            const y = center.y;
            const targetX = (1 - x) * 2 - 1; 
            const targetY = -(y * 2 - 1);
            
            // Smoothing
            const deltaMove = Math.sqrt(Math.pow(targetX - mouse.x, 2) + Math.pow(targetY - mouse.y, 2));
            const alpha = deltaMove > 0.05 ? 0.5 : 0.1;
            mouse.x = mouse.x * (1 - alpha) + targetX * alpha;
            mouse.y = mouse.y * (1 - alpha) + targetY * alpha;
            
            updateRollOver();
            
            // Depth Calculation (Map hand size to Z-depth)
            // Hand size typically 0.05 (far) to 0.25 (close)
            // Map to camera distance: Far = 5m, Close = 1m
            const handDepth = center.depth || 0.1;
            const targetDist = Math.max(1, Math.min(5, 5 - (handDepth - 0.05) * 20));

            // Update Visual Cursor
            raycaster.setFromCamera(mouse, camera);
            const cursorHits = raycaster.intersectObjects([floor, ...designMeshes], false);
            
            // Priority: Surface Snap > Air Depth
            // But if Grabbing, we might want to follow Hand Depth if pulling away?
            // For now, keep surface snap for placing blocks easily.
            if (cursorHits.length > 0) {
               handCursor.position.copy(cursorHits[0].point);
            } else {
               const point = new THREE.Vector3();
               raycaster.ray.at(targetDist, point);
               handCursor.position.copy(point);
            }
            handCursor.visible = creative;

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

            // 2. Handle Gestures

            // Reset cursor state (IDLE = Yellow)
            if (!isPinchingState && gesture !== 'delete') {
                 handCursor.material.color.setHex(0xffff00);
                 if (handCursor.userData.ring) handCursor.userData.ring.material.color.setHex(0xffff00);
                 handCursor.scale.set(1, 1, 1);
            }
            
            // DELETE (Two Fingers / Peace Sign)
            if (gesture === 'delete') {
                 handCursor.material.color.setHex(0xff0000);
                 if (handCursor.userData.ring) handCursor.userData.ring.material.color.setHex(0xff0000);
                 
                 if (creative && Date.now() - lastDeleteTime > 500) { // 500ms cooldown
                    raycaster.setFromCamera(mouse, camera);
                    const hits = raycaster.intersectObjects(designMeshes, false);
                    if (hits.length > 0) {
                        const target = hits[0].object;
                        scene.remove(target);
                        designMeshes.splice(designMeshes.indexOf(target), 1);
                        target.geometry.dispose();
                        target.material.dispose();
                        lastDeleteTime = Date.now();
                        
                        // Sound effect could go here
                        if (stateRef.current.api && stateRef.current.api.playSound) {
                            // stateRef.current.api.playSound('delete'); 
                        }
                    }
                 }
                 return; // Skip other gestures
            }

            // SCALE (Two Hands)
            if (gesture === 'scale') {
                if (lastScaleDist > 0) {
                    const delta = scaleDistance - lastScaleDist;
                    // Zoom sensitivity
                    if (Math.abs(delta) > 0.005) {
                         // Pinch Out (positive delta) -> Zoom In (increase zoom val)
                         if (onZoomChange) onZoomChange(z => Math.max(0.1, Math.min(5, z + delta * 2)));
                    }
                }
                lastScaleDist = scaleDistance;
            } else {
                lastScaleDist = -1;
            }

            // PINCH (Grab/Place)
            const isPinching = gesture === 'pinch';
            
            // Hysteresis
            if (isPinchingState && !isPinching) {
                // Release
                isPinchingState = false;
                if (grabbedObject) {
                    grabbedObject.material.emissive.setHex(0x000000);
                    grabbedObject = null;
                }
            } else if (!isPinchingState && isPinching) {
                // Grab/Start
                isPinchingState = true;
                
                if (creative) {
                    // Try to grab existing object
                    raycaster.setFromCamera(mouse, camera);
                    const hits = raycaster.intersectObjects(designMeshes, false);
                    if (hits.length > 0) {
                        grabbedObject = hits[0].object;
                        grabbedObject.material.emissive.setHex(0x444444);
                    }
                }
            }

            setDebugInfo(`Hands: ${data.hands.length}\nGesture: ${gesture}\nState: ${creative ? 'Creative' : 'View'}`);

            if (isPinchingState) {
                if (pointerRef && pointerRef.current) pointerRef.current.style.borderColor = '#00ff00';
                handCursor.material.color.setHex(0x00ff00);
                if (handCursor.userData.ring) handCursor.userData.ring.material.color.setHex(0x00ff00);
                handCursor.scale.set(1.2, 1.2, 1.2);
                
                if (creative) {
                   if (gesture === 'scale') return; // Don't draw while scaling
                   
                   if (grabbedObject) {
                       // MOVE Logic: Snap to grid
                       grabbedObject.position.copy(handCursor.position).divideScalar(0.5).floor().multiplyScalar(0.5).addScalar(0.25);
                   } else if (tool === "brush" && brushActive) {
                       brushAtPointer();
                   } else {
                       // Drag-to-Spawn
                       const dist = lastPlacementPos.distanceTo(handCursor.position);
                       if (dist >= 0.45) {
                           placeAtPointer();
                           lastPlacementPos.copy(handCursor.position);
                       }
                   }
                }
            } else {
                lastPlacementPos.set(Infinity, Infinity, Infinity);
                if (pointerRef && pointerRef.current) pointerRef.current.style.borderColor = 'yellow';
                handCursor.material.color.setHex(0xffff00);
                if (handCursor.userData.ring) handCursor.userData.ring.material.color.setHex(0xffff00);
                handCursor.scale.set(1.0, 1.0, 1.0);
            }

        } else {
            setDebugInfo("Hands: 0");
            handCursor.visible = false;
            if (pointerRef && pointerRef.current) pointerRef.current.style.display = 'none';
        }
      });
      
      await handController.initialize();
      
    } catch (e) {
      console.error("Webcam init failed", e);
      setDebugInfo(`Error: ${e.message}`);
      isWebcamActive = false;
    }
  }

  function stopWebcam() {
     if (handController) {
         handController.stop();
         handController = null;
     }
     isWebcamActive = false;
     if (videoRef.current) {
         videoRef.current.style.display = 'none';
         scene.background = new THREE.Color(0x050510);
     }
  }

  const clock = new THREE.Clock();

  // Mood State for Smooth Transitions (LERP)
  const currentMoodWeights = { scolding: 0, shy: 0, possessive: 0, surprised: 0, caring: 0 };
  const targetMoodWeights = { scolding: 0, shy: 0, possessive: 0, surprised: 0, caring: 0 };
  let lastMoodUpdate = Date.now();
  let currentMood = "neutral"; 
  let isSpeaking = false;

  // Texture Overlay Helper
  function updateTextureOverlay(mesh, mood, blushIntensity = 0.4) {
      if (!mesh.userData.originalTexture) {
           // Cache original texture image
           mesh.userData.originalTexture = mesh.material.uniforms.uTexture.value.image;
      }
      const img = mesh.userData.originalTexture;
      if (!img) return;

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Add Mood Overlays
      if (mood === "scolding" || mood === "strict") {
           // Angry Vein
           ctx.font = `${canvas.width * 0.15}px serif`;
           ctx.fillText("💢", canvas.width * 0.7, canvas.height * 0.3);
      } else if (mood === "caring" || mood === "shy" || mood === "tsundere") {
           // Soft Blush (Pink Ovals) - Dynamic Intensity
           ctx.globalAlpha = blushIntensity;
           ctx.fillStyle = "#ff69b4";
           
           if (mood === "tsundere" && blushIntensity > 0.6) {
               ctx.fillStyle = "#ff0055"; // Deep red for high intensity
           }

           ctx.beginPath();
           ctx.ellipse(canvas.width * 0.3, canvas.height * 0.55, canvas.width*0.1, canvas.height*0.06, 0, 0, Math.PI*2);
           ctx.fill();
           ctx.beginPath();
           ctx.ellipse(canvas.width * 0.7, canvas.height * 0.55, canvas.width*0.1, canvas.height*0.06, 0, 0, Math.PI*2);
           ctx.fill();
           
           if (mood === "tsundere" && blushIntensity > 0.7) {
                // Steam Effect
                ctx.globalAlpha = 1.0;
                ctx.font = `${canvas.width * 0.15}px serif`;
                ctx.fillText("💨", canvas.width * 0.8, canvas.height * 0.2);
           }
           
           ctx.globalAlpha = 1.0;
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = false; 
      mesh.material.uniforms.uTexture.value = tex;
  }

  function updateModelTexture(base64Image) {
      if (!model) return;
      const img = new Image();
      img.onload = () => {
          const tex = new THREE.Texture(img);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.flipY = false;
          tex.needsUpdate = true;
          
          model.traverse(child => {
              if (child.isMesh && child.material.uniforms && child.material.uniforms.uTexture) {
                  child.material.uniforms.uTexture.value = tex;
                  child.userData.originalTexture = img; // Update original for overlays
              }
          });
      };
      img.src = base64Image;
  }

  function animate() {
    const { creative } = stateRef?.current || {};
    
    const t = clock.getElapsedTime();

    // 1. Mood Decay Logic (Visual)
    if (Date.now() - lastMoodUpdate > 8000) {
        Object.keys(targetMoodWeights).forEach(k => targetMoodWeights[k] = 0);
        // currentMood remains for texture, but weights drop
    }

    // 2. LERP Weights
    Object.keys(currentMoodWeights).forEach(k => {
        const diff = targetMoodWeights[k] - currentMoodWeights[k];
        currentMoodWeights[k] += diff * 0.05; 
    });

    scene.traverse((child) => {
      if (child.isMesh && child.material.uniforms && child.material.uniforms.uTime) {
         child.material.uniforms.uTime.value = t;
      }
    });

    if (controls) {
        controls.autoRotate = !creative;
        controls.update();
    }

    // Audio-Reactive Micro-Expressions
    let jitterX = 0;
    let jitterY = 0;
    let jitterZ = 0;
    
    jitterY += Math.sin(t * 1.5) * 0.005; 
    
    if (isSpeaking) {
       jitterX += (Math.random() - 0.5) * 0.02;
       jitterY += (Math.random() - 0.5) * 0.02;
       jitterZ += (Math.random() - 0.5) * 0.01;
    }

    if (model) {
      model.rotation.y += 0.002;
      model.position.y = Math.sin(Date.now() * 0.002) * 0.04 + jitterY;
      model.rotation.x = jitterX;
      model.rotation.z = jitterZ;

      // Face Warping & Lip Sync
      model.traverse((child) => {
        if (child.isMesh && child.userData.originalPosition) {
             const pos = child.geometry.attributes.position;
             const original = child.userData.originalPosition;
             const mouth = child.userData.mouthIndices || [];
             const brow = child.userData.browIndices || [];
             
             // Reset to original
             for(let i=0; i<pos.count; i++) {
                 pos.setX(i, original.getX(i));
                 pos.setY(i, original.getY(i));
                 pos.setZ(i, original.getZ(i));
             }
             
             // --- APPLY WEIGHTED WARPS ---
             
             // 1. Scolding
             const wScold = currentMoodWeights.scolding;
             if (wScold > 0.01) {
                 brow.forEach(idx => {
                     pos.setY(idx, original.getY(idx) - 0.02 * wScold); 
                     pos.setZ(idx, original.getZ(idx) + 0.01 * wScold); 
                 });
             }

             // 2. Possessive
             const wPossess = currentMoodWeights.possessive;
             if (wPossess > 0.01) {
                 for(let i=0; i<pos.count; i++) {
                     const z = original.getZ(i);
                     pos.setZ(i, z + (z * 0.3 * wPossess));
                 }
             }

             // 3. Shy / Tsundere
             const wShy = currentMoodWeights.shy;
             if (wShy > 0.01) {
                 const theta = -0.15 * wShy;
                 const cos = Math.cos(theta);
                 const sin = Math.sin(theta);
                 for(let i=0; i<pos.count; i++) {
                     const y = original.getY(i);
                     if (y > -0.1) {
                         const weight = Math.min(1.0, (y + 0.1) * 2.0);
                         const x = original.getX(i);
                         const nx = x * cos - y * sin;
                         const ny = x * sin + y * cos;
                         pos.setX(i, x * (1-weight) + nx * weight);
                         pos.setY(i, y * (1-weight) + ny * weight);
                     }
                 }
             }

             // 4. Surprised
             const wSurprise = currentMoodWeights.surprised;
             if (wSurprise > 0.01) {
                 const eyeL = { x: -0.15, y: 0.15 };
                 const eyeR = { x: 0.15, y: 0.15 };
                 const radius = 0.12;
                 for(let i=0; i<pos.count; i++) {
                     const x = original.getX(i);
                     const y = original.getY(i);
                     const dxL = x - eyeL.x; const dyL = y - eyeL.y;
                     const distL = Math.sqrt(dxL*dxL + dyL*dyL);
                     const dxR = x - eyeR.x; const dyR = y - eyeR.y;
                     const distR = Math.sqrt(dxR*dxR + dyR*dyR);
                     
                     if (distL < radius) {
                         const factor = 1.0 + (radius - distL) * 0.8 * wSurprise;
                         pos.setX(i, eyeL.x + dxL * factor);
                         pos.setY(i, eyeL.y + dyL * factor);
                     } else if (distR < radius) {
                         const factor = 1.0 + (radius - distR) * 0.8 * wSurprise;
                         pos.setX(i, eyeR.x + dxR * factor);
                         pos.setY(i, eyeR.y + dyR * factor);
                     }
                 }
             }
             
             // Apply Lip Sync
             if (isSpeaking) {
                 const amp = (Math.sin(t * 20) + 1) * 0.015; 
                 mouth.forEach(idx => {
                     pos.setZ(idx, pos.getZ(idx) + amp);
                 });
             }
             
             pos.needsUpdate = true;
        }
      });
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



  const speak = (text) => {
    if ('speechSynthesis' in window) {
      // Holographic Audio Effect
      playVoiceSkin("self"); 
      
      const u = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes("Google") && v.name.includes("Female")) || voices[0];
      if (preferred) u.voice = preferred;
      
      // Pitch/Rate tweaks for "AI" feel
      u.pitch = 1.1; 
      u.rate = 1.05;
      
      window.speechSynthesis.speak(u);
    }
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
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        setDebugInfo("🎤 Listening... Ask Meg anything!");
        if(onVoiceStateChange) onVoiceStateChange(true);
    };

    recognition.onend = () => {
        setDebugInfo("Voice Idle (Click Mic to wake Meg)");
        if(onVoiceStateChange) onVoiceStateChange(false);
    };

    recognition.onresult = async (event) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();
      setDebugInfo(`🎤 Heard: "${transcript}"`);

      // 1. Semantic Intent (Llama 1B)
      try {
          const res = await fetch('/api/command', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transcript })
          });
          const data = await res.json();
          
          if (data.command) {
              const cmd = data.command.toUpperCase();
              const obj = data.object ? data.object.toUpperCase() : "";
              
              setDebugInfo(`🤖 Intent: ${cmd} ${obj}`);

              if (cmd === 'CREATE') {
                  if (obj === 'CUBE') { placeAtPointer('cube'); speak("Cube created."); }
                  else if (obj === 'SPHERE') { placeAtPointer('sphere'); speak("Sphere created."); }
                  else if (obj === 'PYRAMID') { placeAtPointer('pyramid'); speak("Pyramid created."); }
                  else if (obj === 'VOXEL') { placeAtPointer('voxel'); speak("Voxel placed."); }
              } 
              else if (cmd === 'UNDO') { undo(); speak("Undo."); }
              else if (cmd === 'CLEAR') { clearVoxels(); speak("Cleared."); }
              else if (cmd === 'DELETE') { 
                  // Trigger delete mode or delete selection?
                  // For now, just say "Use the peace sign to delete."
                  speak("Show me a peace sign to delete objects.");
              }
              else if (cmd === 'TEXTURE') {
                  const style = data.params?.style || "default";
                  speak(`Okay, changing style to ${style}. This might take a moment.`);
                  try {
                      const texRes = await fetch('/api/texture', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ prompt: style })
                      });
                      const texData = await texRes.json();
                      if (texData.image) {
                          updateModelTexture(texData.image);
                          speak("Done! How do I look?");
                      } else {
                          speak("I couldn't find that outfit in my closet.");
                      }
                  } catch (e) {
                      console.error("Texture error:", e);
                      speak("Something went wrong with the wardrobe.");
                  }
              }
              return;
          }
      } catch (e) {
          console.warn("Intent parsing failed, falling back to Chat:", e);
      }

      // 2. Fallback to Assistant Chat (Personality)
      try {
          // Use relative path via proxy
          const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: transcript })
          });
          const data = await res.json();
          if (data.response) {
              speak(data.response);
              setDebugInfo(`Meg: ${data.response}`);
          }
      } catch (e) {
          console.error("Chat error", e);
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
         
         if (event.error !== 'aborted') {
             setDebugInfo(`⚠️ Voice: ${msg}`);
         }
         if(onVoiceStateChange) onVoiceStateChange(false);
    };

    return recognition;
  };

  // Initialize but don't start yet
  setupVoiceControl();

  return {
    exportOBJ: () => {
      const exporter = new OBJExporter();
      // Filter: Only export designMeshes (user creations) + model (loaded hologram)
      const exportGroup = new THREE.Group();
      designMeshes.forEach(m => exportGroup.add(m.clone()));
      if (model) exportGroup.add(model.clone());
      
      const result = exporter.parse(exportGroup);
      return new Blob([result], { type: 'text/plain' });
    },
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
    undo,
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
    },
    setMood: (m, blushIntensity = 0, vertexWarp = "none") => {
        // Update mood state
        const previousMood = currentMood;
        currentMood = m;
        lastMoodUpdate = Date.now();

        // Reset all targets to 0
        Object.keys(targetMoodWeights).forEach(k => targetMoodWeights[k] = 0);

        // Set specific target to 1 based on mood string
        if (m === "scolding" || m === "strict") targetMoodWeights.scolding = 1;
        else if (m === "possessive") targetMoodWeights.possessive = 1;
        else if (m === "shy" || m === "tsundere") targetMoodWeights.shy = 1;
        else if (m === "surprised" || m === "scolded") targetMoodWeights.surprised = 1;
        else if (m === "caring") targetMoodWeights.caring = 1; 

        // INSTANT SNAP BACK (Tsundere Logic)
        // If switching from Blush -> Scolding, bypass LERP for instant impact
        if ((previousMood === "shy" || previousMood === "tsundere") && (m === "scolding" || m === "strict")) {
             currentMoodWeights.scolding = 1;
             currentMoodWeights.shy = 0;
             currentMoodWeights.possessive = 0;
             currentMoodWeights.surprised = 0;
             currentMoodWeights.caring = 0;
        }

        // Trigger Texture Update (Blush/Veins)
        if (model) {
            model.traverse(child => {
                if (child.isMesh && child.material.uniforms && child.material.uniforms.uTexture.value && child.material.uniforms.uTexture.value.image) {
                     updateTextureOverlay(child, m, blushIntensity);
                }
            });
        }
    },
    setSpeaking: (s) => {
        isSpeaking = s;
    }
  };
}
