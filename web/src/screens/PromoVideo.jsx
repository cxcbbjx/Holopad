import { useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, Float, Stars, Sparkles, PerspectiveCamera, Environment, useTexture, Grid, MeshDistortMaterial } from "@react-three/drei";
import { EffectComposer, Bloom, Noise, Vignette, ChromaticAberration, Scanline } from "@react-three/postprocessing";
import * as THREE from "three";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// --- SCENE COMPONENTS ---

// Dynamic Atmosphere Controller (The "Apple" Vibe)
function Atmosphere({ themeRef }) {
  const { scene } = useThree();
  
  useFrame(() => {
    if (themeRef.current) {
      // Background
      if (!scene.background || !scene.background.isColor) {
        scene.background = new THREE.Color(themeRef.current.bg);
      } else {
        scene.background.set(themeRef.current.bg);
      }

      // Fog
      if (scene.fog) {
        scene.fog.color.set(themeRef.current.fog);
        scene.fog.near = themeRef.current.fogNear;
        scene.fog.far = themeRef.current.fogFar;
      }
    }
  });

  return null;
}

// Shared: Workspace Grid (The "Holopad" Floor)
function WorkspaceGrid() {
  return (
    <Grid 
      position={[0, -2, 0]} 
      args={[20, 20]} 
      cellSize={1} 
      cellThickness={1} 
      cellColor="#202020" 
      sectionSize={5} 
      sectionThickness={1.5} 
      sectionColor="#00f0ff" 
      fadeDistance={25} 
      infiniteGrid 
    />
  );
}

// Scene 2: Hand controlling voxels (Actual App Style)
function VoxelField({ active }) {
  const group = useRef();
  // Create a grid of voxels mimicking the app's building block
  const voxels = useMemo(() => {
    return new Array(15).fill(0).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4
      ],
      rotation: [0, Math.random() * Math.PI, 0],
      scale: 0.8 // Standard voxel size
    }));
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    
    // Float animation
    group.current.children.forEach((child, i) => {
      child.position.y += Math.sin(t * 2 + i) * 0.005;
      if (active) {
         // Swarm effect: move towards center
         child.position.lerp(new THREE.Vector3(0, 0, 0), 0.01);
         child.rotation.x += 0.02;
         child.rotation.y += 0.02;
      }
    });
  });

  return (
    <group ref={group}>
      {voxels.map((data, i) => (
        <group key={i} position={data.position} rotation={data.rotation}>
          {/* Inner Core (Voxel) */}
          <mesh>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <meshStandardMaterial 
              color="#00f0ff" 
              emissive="#00f0ff"
              emissiveIntensity={0.8}
              transparent
              opacity={0.3}
            />
          </mesh>
          {/* Wireframe Edge (Selection Highlight) */}
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(0.8, 0.8, 0.8)]} />
            <lineBasicMaterial color="#ffffff" />
          </lineSegments>
        </group>
      ))}
    </group>
  );
}

// Scene 3: Photo to Hologram (Scanning Effect)
function PhotoToHologram({ active }) {
  const mesh = useRef();
  const scanBeam = useRef();
  
  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();

    if (active) {
       // Extrude: Z-scale grows
       mesh.current.scale.lerp(new THREE.Vector3(1, 1, 15), 0.04);
       // Rotate slightly to show depth
       mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, 0.5, 0.05);
       
       // Scan beam moves up and down
       if (scanBeam.current) {
         scanBeam.current.position.y = Math.sin(t * 3) * 1.5;
       }
    } else {
       mesh.current.scale.set(1, 1, 0.1);
       mesh.current.rotation.y = 0;
    }
  });

  return (
    <group position={[0, 0, 0]}>
        {/* The "Photo" -> "Hologram" Object */}
        <mesh ref={mesh}>
            <boxGeometry args={[3, 4, 0.1]} />
            {/* Front Face: The Image */}
            <meshPhysicalMaterial 
                color="#ffffff"
                roughness={0.2}
                metalness={0.1}
                transmission={0} // Solid at first
                emissive="#000000"
            />
        </mesh>
        
        {/* Scanning Laser Beam */}
        <mesh ref={scanBeam} rotation={[0, 0, Math.PI / 2]} visible={active}>
            <cylinderGeometry args={[0.05, 0.05, 5, 32]} />
            <meshBasicMaterial color="#00ff00" transparent opacity={0.8} />
            <pointLight color="#00ff00" intensity={2} distance={3} />
        </mesh>
        
        {/* Wireframe Ghost (The "Blueprint") */}
        <mesh scale={[3.1, 4.1, 15]} visible={active}>
             <boxGeometry args={[1, 1, 0.1]} />
             <meshBasicMaterial wireframe color="#00f0ff" transparent opacity={0.1} />
        </mesh>
    </group>
  );
}

// Scene 4: Meg (AI Persona) - Liquid Sphere
function MegPersona({ active }) {
    const mesh = useRef();
    
    useFrame((state) => {
        if (!mesh.current) return;
        // Float
        mesh.current.position.y = Math.sin(state.clock.getElapsedTime()) * 0.2;
    });

    return (
        <mesh ref={mesh} visible={active} scale={1.5}>
            <sphereGeometry args={[1, 64, 64]} />
            <MeshDistortMaterial
                color="#aa00ff"
                emissive="#5500aa"
                emissiveIntensity={1}
                roughness={0.1}
                metalness={1}
                distort={0.6} // Liquid effect
                speed={3}
            />
        </mesh>
    );
}

// Cinematic Camera Rig (Subtle Motion)
function CameraRig() {
    useFrame((state) => {
        // Gentle sway based on time
        const t = state.clock.getElapsedTime();
        state.camera.position.x = Math.sin(t * 0.2) * 0.5;
        state.camera.position.y = 1 + Math.cos(t * 0.3) * 0.2;
        state.camera.lookAt(0, 0, 0);
    });
    return null;
}

// --- MAIN COMPONENT ---

export default function PromoVideo() {
  const [sceneIndex, setSceneIndex] = useState(0); 
  const timelineRef = useRef(null);
  
  // Theme State for Animations
  const themeRef = useRef({
    bg: "#050505",
    fog: "#050505",
    fogNear: 5,
    fogFar: 20
  });

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } }); // Snappy transitions
    timelineRef.current = tl;

    // 0. Micro-Emotion Hook (0-2s) - Silence
    tl.to(themeRef.current, { bg: "#000000", fog: "#000000", fogNear: 10, fogFar: 30, duration: 0.1 })
      .to(".text-0", { opacity: 1, duration: 1, ease: "power2.out" })
      .to(".text-0", { opacity: 0, duration: 0.5, delay: 0.5 });

    // Scene 1: 3-8s (Deep Void) -> Slow build
    tl.to(themeRef.current, { bg: "#000000", fog: "#000000", fogNear: 10, fogFar: 30, duration: 1 }, "+=0.5") // Wait for silence
      .to({}, { duration: 0.5, onStart: () => setSceneIndex(1) }, "<") 
      .to(".text-1", { opacity: 1, duration: 1 })
      .to(".text-1", { opacity: 0, duration: 0.2, delay: 2, ease: "power4.in" });

    // Scene 2: 9-13s (Voxels - Tech Blue) -> DROP
    tl.to(themeRef.current, { bg: "#020210", fog: "#020210", fogNear: 8, fogFar: 25, duration: 0.2 }, "-=0.1") 
      .to({}, { duration: 0, onStart: () => setSceneIndex(2) }, "<")
      .to(".text-2", { opacity: 1, duration: 0.5, ease: "elastic.out(1, 0.5)" }) 
      .to(".text-2", { opacity: 0, duration: 0.2, delay: 3, ease: "power4.in" });

    // Scene 3: 14-17s (Hologram - Studio Dark Grey) -> DROP
    tl.to(themeRef.current, { bg: "#0a0a0a", fog: "#0a0a0a", fogNear: 5, fogFar: 20, duration: 0.5 }, "-=0.1")
      .to({}, { duration: 0, onStart: () => setSceneIndex(3) }, "<")
      .to(".text-3", { opacity: 1, duration: 0.5 }) 
      .to(".text-3", { opacity: 0, duration: 0.2, delay: 2, ease: "power4.in" });

    // Scene 4: 18-20s (Meg AI - Deep Purple) -> DROP
    tl.to(themeRef.current, { bg: "#0f0518", fog: "#0f0518", fogNear: 2, fogFar: 15, duration: 1 }, "-=0.1")
      .to({}, { duration: 0, onStart: () => setSceneIndex(4) })
      .to(".text-4", { opacity: 1, duration: 0.5 }) 
      .to(".text-4", { opacity: 0, duration: 0.2, delay: 1, ease: "power4.in" });

    // Scene 5: 21-24s (Tribe) -> Black BG
    tl.to(themeRef.current, { bg: "#000000", fog: "#000000", fogNear: 10, fogFar: 50, duration: 1 }, "-=0.1")
      .to({}, { duration: 0, onStart: () => setSceneIndex(0) }, "<") // Black screen for text
      .to(".text-social", { opacity: 1, duration: 1 })
      .to(".text-social", { opacity: 0, duration: 0.5, delay: 2 });

    // Scene 6: 25-30s (Logo - Pitch Black) -> FINALE
    tl.to({}, { duration: 0, onStart: () => setSceneIndex(5) })
      .to(".logo-reveal", { opacity: 1, scale: 1, duration: 1.5, ease: "expo.out" })
      .to(".text-5", { opacity: 1, duration: 1 }, "-=1")
      .to(".founder-sig", { opacity: 0.6, duration: 1 }, "-=0.5"); 

  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050505", position: "relative", overflow: "hidden" }}>
        
        {/* HUD OVERLAY REMOVED */ }

        {/* 3D CANVAS */}
        <Canvas shadows gl={{ antialias: false }} dpr={[1, 2]}>
            <PerspectiveCamera makeDefault position={[0, 1, 8]} fov={50} />
            <CameraRig />
            
            {/* Dynamic Atmosphere */}
            <Atmosphere themeRef={themeRef} timeline={timelineRef} />
            <fog attach="fog" args={["#050505", 5, 20]} /> {/* Initial fog, updated by Atmosphere */}
            
            {/* AMBIENT LIGHTING */}
            <ambientLight intensity={0.2} />
            <spotLight position={[10, 10, 10]} angle={0.5} penumbra={1} intensity={2} castShadow color="#00f0ff" />
            <pointLight position={[-10, -5, -10]} intensity={1} color="#ff00ff" />

            {/* GLOBAL ELEMENTS */}
            <WorkspaceGrid />
            <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

            {/* SCENE 2: VOXELS */}
            <group visible={sceneIndex === 2}>
                <VoxelField active={true} />
            </group>

            {/* SCENE 3: HOLOGRAM SCAN */}
            <group visible={sceneIndex === 3}>
                <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                    <PhotoToHologram active={true} />
                </Float>
                <Sparkles count={50} scale={6} size={4} speed={0.4} opacity={0.5} color="#00ff00" />
            </group>

            {/* SCENE 4: MEG AI */}
            <group visible={sceneIndex === 4}>
                <Float speed={4} rotationIntensity={0.1} floatIntensity={0.2}>
                    <MegPersona active={true} />
                </Float>
                <Sparkles count={150} scale={8} size={2} speed={1} opacity={0.8} color="#aa00ff" />
            </group>
            
            {/* POST PROCESSING */}
            <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.2} radius={0.5} />
                <Noise opacity={0.1} />
                <Vignette eskil={false} offset={0.1} darkness={1.2} />
                <ChromaticAberration offset={[0.0015, 0.0015]} />
                {/* <Scanline density={1.5} opacity={0.05} /> */}
            </EffectComposer>
        </Canvas>

        {/* TEXT OVERLAYS */}
        <div className="ui-layer" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            
            <h1 className="text-0" style={{ ...textStyle, opacity: 0, fontSize: "1.5rem", fontStyle: "italic", color: "#888" }}>
                "This started with an imagination."
            </h1>

            <h1 className="text-1" style={{ ...textStyle, opacity: 0 }}>
                Have you ever imagined<br/>building in air?
            </h1>

            <h1 className="text-2" style={{ ...textStyle, opacity: 0 }}>
                Touch the digital.
            </h1>

            <h1 className="text-3" style={{ ...textStyle, opacity: 0 }}>
                No mouse.<br/>No keyboard.
            </h1>

            <h1 className="text-4" style={{ ...textStyle, opacity: 0, color: "#d8b4fe", textShadow: "0 0 30px #aa00ff" }}>
                We Introduce MEG.<br/><span style={{fontSize: "1rem", opacity: 0.8, color: "#fff"}}>Your AI Companion</span>
            </h1>

            <h1 className="text-social" style={{ ...textStyle, opacity: 0, fontSize: "1.2rem", color: "#ccc" }}>
                Early users:<br/>
                <span style={{ fontSize: "1.8rem", color: "#fff", fontWeight: "bold" }}>Creators. </span>
                <span style={{ fontSize: "1.8rem", color: "#00f0ff", fontWeight: "bold", textShadow: "0 0 10px #00f0ff" }}>Builders. </span>
                <span style={{ fontSize: "1.8rem", color: "#d8b4fe", fontWeight: "bold", textShadow: "0 0 20px #aa00ff" }}>Dreamers.</span>
            </h1>

            <div className="logo-reveal" style={{ opacity: 0, transform: "scale(0.8)", textAlign: "center" }}>
                <div style={{ fontSize: "4rem", fontWeight: "bold", letterSpacing: "0.2em", color: "#fff", textShadow: "0 0 40px #00f0ff" }}>
                    HOLO✦PAD
                </div>
                <div className="text-5" style={{ opacity: 0, marginTop: "20px", fontSize: "1.2rem", color: "#aaa", letterSpacing: "0.1em" }}>
                    Join the future.
                </div>
                <div className="text-5" style={{ opacity: 0, marginTop: "10px", fontSize: "0.9rem", color: "#00f0ff" }}>
                     Built by Shivang
                </div>
                
            </div>
        </div>
    </div>
  );
}

const textStyle = {
    position: "absolute",
    fontSize: "2.5rem",
    fontWeight: "300",
    color: "#fff",
    textAlign: "center",
    letterSpacing: "0.05em",
    lineHeight: "1.4",
    textShadow: "0 0 20px rgba(255,255,255,0.5)",
    fontFamily: "'Inter', sans-serif" 
};
