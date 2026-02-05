import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import { useSound, soundManager } from '../utils/SoundManager';
import '../styles/theme.css';


// --- Shaders ---

const vertexShader = `
varying vec2 vUv;
varying float vElevation;
uniform float uTime;
uniform vec2 uMouse;

void main() {
  vUv = uv;
  
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  
  // Elevation based on sine waves and mouse interaction
  float elevation = sin(modelPosition.x * 2.0 + uTime * 0.5) * 
                    sin(modelPosition.y * 2.0 + uTime * 0.5) * 0.2;
                    
  // Distance from mouse for ripple effect
  // converting mouse to world space roughly for this effect
  float dist = distance(uv, uMouse);
  elevation += sin(dist * 10.0 - uTime * 2.0) * exp(-dist * 3.0) * 0.5;

  modelPosition.z += elevation;
  vElevation = elevation;

  gl_Position = projectionMatrix * viewMatrix * modelPosition;
}
`;

const fragmentShader = `
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vElevation;
varying vec2 vUv;

void main() {
  // Mix colors based on elevation
  float mixStrength = (vElevation + 0.25) * 2.0;
  vec3 color = mix(uColorA, uColorB, mixStrength);
  
  // Add a grid pattern
  float grid = step(0.98, max(sin(vUv.x * 50.0), sin(vUv.y * 50.0)));
  color += grid * 0.5;

  gl_FragColor = vec4(color, 1.0);
}
`;

// --- Components ---

const FluidPlane = () => {
  const mesh = useRef();
  const { viewport, pointer } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColorA: { value: new THREE.Color('#1a1a2e') }, // Dark Blue
      uColorB: { value: new THREE.Color('#e94560') }, // Accent Red/Pink
    }),
    []
  );

  useFrame((state) => {
    const { clock } = state;
    if (mesh.current) {
      mesh.current.material.uniforms.uTime.value = clock.getElapsedTime();
      
      // Smooth mouse interpolation
      mesh.current.material.uniforms.uMouse.value.lerp(
        new THREE.Vector2(pointer.x * 0.5 + 0.5, pointer.y * 0.5 + 0.5), 
        0.1
      );
    }
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[viewport.width * 1.5, viewport.height * 1.5, 128, 128]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const SceneContent = () => {
    // Camera Animation on mount
    useFrame((state) => {
        // subtle camera movement
        const time = state.clock.elapsedTime;
        state.camera.position.x = Math.sin(time * 0.1) * 0.5;
        state.camera.position.y = Math.cos(time * 0.1) * 0.5;
        
        // "Teleport" arrival effect - initial zoom out
        // We use a dampening factor to ease it into position
        state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 5, 0.05);
        
        state.camera.lookAt(0,0,0);
    });

    return (
        <>
            <FluidPlane />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
        </>
    );
}

const Overlay = () => {
    const titleRef = useRef();
    const subRef = useRef();

    useEffect(() => {
        // Trigger ambient sound if not already playing
        soundManager.startAmbient();

        gsap.fromTo(titleRef.current, 
            { opacity: 0, y: 50 }, 
            { opacity: 1, y: 0, duration: 1.5, ease: "power3.out", delay: 0.5 }
        );
        gsap.fromTo(subRef.current, 
            { opacity: 0, y: 20 }, 
            { opacity: 1, y: 0, duration: 1.5, ease: "power3.out", delay: 0.8 }
        );
    }, []);

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            zIndex: 10,
            mixBlendMode: 'difference' // Cool effect against the shader
        }}>
            <h1 ref={titleRef} 
                onMouseEnter={() => soundManager.playHover()}
                onClick={() => soundManager.playClick()}
                style={{ 
                    fontSize: '5rem', 
                    fontWeight: 'bold', 
                    letterSpacing: '-0.05em',
                    margin: 0,
                    fontFamily: "'Helvetica Neue', sans-serif", // Clean modern font
                    pointerEvents: 'auto',
                    cursor: 'pointer'
            }}>
                HOLOSTAGE
            </h1>
            <p ref={subRef} style={{
                fontSize: '1.2rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                opacity: 0.8
            }}>
                Immersive Experience
            </p>
        </div>
    )
}

export default function HolostagePage() {
  useSound(); // Ensure sound manager is initialized

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      <Canvas
        dpr={[1, 2]} // Handle pixel ratio
        camera={{ position: [0, 2, 20], fov: 45 }} // Start further back for zoom effect
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping }} // Performance opt
      >

        <SceneContent />
        
        <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.5} />
            <ChromaticAberration offset={[0.002, 0.002]} blendFunction={BlendFunction.NORMAL} />
            <Noise opacity={0.05} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
      <Overlay />
    </div>
  );
}
