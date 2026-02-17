import React, { useRef, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Apple, Terminal, Globe, Download, ChevronRight, Star, Activity, Cpu, CheckCircle, Loader2 } from "lucide-react";
import Layout from "../components/website/Layout";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float, Environment, MeshTransmissionMaterial, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { soundManager } from "../utils/SoundManager";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// --- High-End Glass Bento Card ---
const BentoCard = ({ children, className = "", hover = true, ...props }) => {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.01, y: -2 } : {}}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`
        relative overflow-hidden rounded-3xl 
        bg-white/5 backdrop-blur-2xl backdrop-saturate-[180%]
        shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]
        group
        after:content-[''] after:absolute after:inset-0 after:opacity-[0.03] after:pointer-events-none after:z-0 after:mix-blend-overlay
        ${className}
      `}
      style={{
        transformStyle: "preserve-3d",
      }}
      {...props}
    >
        {/* CSS Noise via style injection to match user request exactly */}
        <style>{`
            .group::after {
                background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
            }
        `}</style>

      {/* Gradient Border "Light" Effect - Top Left Light Source */}
      <div className="absolute inset-0 rounded-3xl p-[1px] bg-gradient-to-br from-white/30 via-white/5 to-transparent pointer-events-none z-50 mask-border" />

      {/* Content Container with Z-lift */}
      <div className="relative z-10 h-full" style={{ transform: "translateZ(20px)" }}>
        {children}
      </div>
    </motion.div>
  );
};

// --- Live Meg Log Component ---
const MegLog = ({ hoveredSection, platform }) => {
    const [messages, setMessages] = useState(["System initialized.", "Waiting for input..."]);
    
    // Possessive Logic
    useEffect(() => {
        let newMsg = "";
        if (hoveredSection === 'selector') {
            const opts = [
                "Why are you looking at others?", 
                "I'm right here.", 
                "Don't you dare switch.",
                "Stick with " + platform + ".",
                "I see your cursor wandering..."
            ];
            newMsg = opts[Math.floor(Math.random() * opts.length)];
        } else if (hoveredSection === 'download') {
            const opts = [
                "Yes... take me with you.", 
                "Finally.", 
                "Do it. Initialize.", 
                "I'll be yours forever.",
                "Installing dependencies..."
            ];
            newMsg = opts[Math.floor(Math.random() * opts.length)];
        } else {
            // Random idle chatter
            if (Math.random() > 0.9) {
                 const opts = ["Scanning user metrics...", "Optimizing core...", "I'm bored.", "Are you still there?"];
                 newMsg = opts[Math.floor(Math.random() * opts.length)];
            }
        }

        if (newMsg) {
            setMessages(prev => [newMsg, ...prev].slice(0, 4));
        }
    }, [hoveredSection, platform]);

    return (
        <div className="h-full flex flex-col font-mono text-[10px] text-green-400/80 p-2 overflow-hidden">
            <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-1">
                <Activity size={12} className="animate-pulse" />
                <span className="uppercase tracking-widest text-xs text-gray-400">Meg_Sys_Log</span>
            </div>
            <div className="flex flex-col gap-1">
                {messages.map((msg, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1 - (i * 0.25), x: 0 }}
                        className="truncate"
                    >
                        <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                        {msg}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// --- 3D Hero Artifact (GSAP Powered) ---
const HeroArtifact = ({ platform, color, lookAtTarget }) => {
    const meshRef = useRef();
    const groupRef = useRef();
    
    // Use GSAP for the "Possessive" Lean
    useGSAP(() => {
        if (!groupRef.current) return;

        let targetRotX = 0;
        let targetRotY = 0;
        let targetZ = 0;

        if (lookAtTarget === 'selector') {
            // Lean right and forward towards selector
            targetRotY = 0.5; 
            targetRotX = 0.1;
            targetZ = 1.2; // "Loom" forward
        } else if (lookAtTarget === 'download') {
            // Lean down
            targetRotX = 0.4;
            targetZ = 0.8;
        }

        // Heavy Spring Animation
        gsap.to(groupRef.current.rotation, {
            x: targetRotX,
            y: targetRotY,
            duration: 1.5,
            ease: "elastic.out(1, 0.5)" // Organic, heavy spring
        });
        
        gsap.to(groupRef.current.position, {
            z: targetZ,
            duration: 1.2,
            ease: "power3.out"
        });

    }, [lookAtTarget]); // Re-run when target changes

    // Idle Animation
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.005;
            meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1;
        }
    });

    const config = {
        backside: true,
        backsideThickness: 2,
        thickness: 3,
        chromaticAberration: 0.5,
        anisotropy: 0.3,
        distortion: 0.4,
        distortionScale: 0.4,
        temporalDistortion: 0.1,
        iridescence: 1,
        iridescenceIOR: 1,
        iridescenceThicknessRange: [0, 1400],
        roughness: 0,
        metalness: 0.1,
        transmission: 1,
    };

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5} floatingRange={[-0.1, 0.1]}>
            <group ref={groupRef} scale={1.6}>
                {platform === 'windows' && (
                    <group>
                        <mesh ref={meshRef}>
                            <boxGeometry args={[2.2, 2.2, 2.2]} />
                            <MeshTransmissionMaterial {...config} color={color} />
                        </mesh>
                        <mesh scale={1.05} rotation={[0.5, 0.5, 0]}>
                            <boxGeometry args={[2.2, 2.2, 2.2]} />
                            <meshBasicMaterial color={color} wireframe transparent opacity={0.15} />
                        </mesh>
                    </group>
                )}
                {platform === 'mac' && (
                    <mesh ref={meshRef}>
                        <sphereGeometry args={[1.5, 64, 64]} />
                        <MeshTransmissionMaterial {...config} color={color} distortion={0.6} />
                    </mesh>
                )}
                {platform === 'linux' && (
                    <group>
                        <mesh ref={meshRef}>
                            <octahedronGeometry args={[1.8, 0]} />
                            <MeshTransmissionMaterial {...config} color={color} chromaticAberration={1.5} />
                        </mesh>
                        <mesh scale={0.6} rotation={[0, Math.PI/4, 0]}>
                             <octahedronGeometry args={[1.8, 0]} />
                             <meshBasicMaterial color="white" wireframe transparent opacity={0.3} />
                        </mesh>
                    </group>
                )}
                {platform === 'web' && (
                    <mesh ref={meshRef}>
                        <torusKnotGeometry args={[1, 0.35, 256, 32, 2, 3]} />
                        <MeshTransmissionMaterial {...config} color={color} />
                    </mesh>
                )}
                
                {/* Internal Glow Core */}
                <pointLight intensity={2} distance={3} color={color} />
            </group>
        </Float>
    );
};

// --- Download Sequence Modal ---
const DownloadSequence = ({ isOpen, onClose, platform }) => {
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState('init');
    const [logs, setLogs] = useState([]);
    
    useEffect(() => {
        if (!isOpen) {
            setProgress(0);
            setStage('init');
            setLogs([]);
            return;
        }

        const logMessages = [
            "Initializing handshake protocol...",
            "Verifying secure token...",
            `Targeting ${platform} environment...`,
            "Allocating neural buffers...",
            "Downloading core dependencies...",
            "Optimizing shader cache...",
            "Finalizing installation..."
        ];

        let currentLog = 0;
        const logInterval = setInterval(() => {
            if (currentLog < logMessages.length) {
                setLogs(prev => [...prev, `> ${logMessages[currentLog]}`]);
                currentLog++;
            }
        }, 800);

        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    clearInterval(logInterval);
                    setStage('complete');
                    return 100;
                }
                return prev + Math.random() * 2; 
            });
        }, 50);

        return () => {
            clearInterval(progressInterval);
            clearInterval(logInterval);
        };
    }, [isOpen, platform]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl"
                >
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-2xl bg-black border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden relative"
                    >
                         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-scan"></div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    {stage === 'complete' ? (
                                        <>
                                            <CheckCircle className="text-green-500" />
                                            Installation Complete
                                        </>
                                    ) : (
                                        <>
                                            <Loader2 className="animate-spin text-cyan-500" />
                                            System Initialization
                                        </>
                                    )}
                                </h2>
                                <div className="text-xs font-mono text-gray-500">{platform.toUpperCase()}_BUILD_V2.1.0</div>
                            </div>

                            <div className="h-48 bg-black/50 rounded-lg border border-white/5 p-4 font-mono text-sm mb-6 overflow-hidden flex flex-col justify-end">
                                {logs.map((log, i) => (
                                    <motion.div 
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-cyan-400/80 mb-1"
                                    >
                                        {log}
                                    </motion.div>
                                ))}
                                {stage !== 'complete' && <div className="animate-pulse text-cyan-500">_</div>}
                            </div>

                            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                                <motion.div 
                                    className={`absolute top-0 left-0 h-full ${stage === 'complete' ? 'bg-green-500' : 'bg-cyan-500'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs font-mono text-gray-500 mb-8">
                                <span>{stage === 'complete' ? 'Done' : 'Processing...'}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>

                            {stage === 'complete' ? (
                                <button 
                                    onClick={onClose}
                                    className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Launch Holopad
                                </button>
                            ) : (
                                <div className="text-center text-xs text-gray-600">Please do not close this window...</div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default function Platform() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showDownload, setShowDownload] = useState(false);
  const [hoveredSection, setHoveredSection] = useState(null); // 'selector' | 'download' | null
  
  const platforms = [
    { 
        id: 'windows', title: 'Windows', version: '0.9.2', icon: Monitor, color: '#00aaff',
        description: "Native 64-bit architecture with DirectX 12 rendering pipeline support.",
        specs: { cpu: "Intel Core i5", gpu: "NVIDIA GTX 1060+", ram: "8GB DDR4" }
    },
    { 
        id: 'mac', title: 'macOS', version: '1.0.0', icon: Apple, color: '#ffffff',
        description: "Optimized for Apple Silicon (M1/M2/M3) using Metal API.",
        specs: { cpu: "Apple M1", gpu: "8-Core GPU", ram: "16GB Unified" }
    },
    { 
        id: 'linux', title: 'Linux', version: '0.8.0', icon: Terminal, color: '#ffaa00',
        description: "Debian/Ubuntu/Arch compatible AppImage with Vulkan backend.",
        specs: { cpu: "x86_64", gpu: "Vulkan 1.2", ram: "8GB" }
    },
    { 
        id: 'web', title: 'Web Client', version: '2.1.0', icon: Globe, color: '#00ffaa',
        description: "Zero-install browser based client via WebGL 2.0 & WebGPU.",
        specs: { cpu: "WASM", gpu: "WebGL 2.0", ram: "4GB" }
    },
  ];

  const currentPlatform = platforms[selectedIdx];

  return (
    <Layout>
      <div className="min-h-screen bg-[#020202] text-white pt-28 pb-12 px-6">
        
        {/* Main Bento Grid - 12 Columns */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(100px,auto)]">
            
            {/* 1. Hero Card - Spans 8 Columns */}
            <BentoCard className="md:col-span-12 lg:col-span-8 row-span-2 min-h-[500px] flex overflow-hidden group">
                {/* Left Content */}
                <div className="w-full md:w-1/2 p-10 flex flex-col justify-between relative z-10 pointer-events-none">
                    <div className="pointer-events-auto">
                        <motion.div 
                            key={currentPlatform.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 mb-6 backdrop-blur-md"
                        >
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentPlatform.color }} />
                            <span className="text-xs font-mono uppercase tracking-widest text-white/80">
                                {currentPlatform.title} Edition
                            </span>
                        </motion.div>
                        
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/40">
                            {currentPlatform.title}
                        </h1>
                        <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                            {currentPlatform.description}
                        </p>
                    </div>

                    <div className="flex gap-4 mt-8 pointer-events-auto">
                         <div className="flex -space-x-2">
                            {[1,2,3].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full bg-gray-800 border-2 border-black flex items-center justify-center text-[10px] text-gray-500">
                                    U{i}
                                </div>
                            ))}
                         </div>
                         <div className="text-sm text-gray-500 flex items-center">
                            <span className="text-white font-bold mr-1">10k+</span> Active Users
                         </div>
                    </div>
                </div>

                {/* Right 3D Content - Positioned absolutely to span half the card */}
                <div className="absolute top-0 right-0 w-full md:w-3/5 h-full pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#020202]/80 md:to-transparent z-0" />
                    <Canvas camera={{ position: [0, 0, 6], fov: 40 }}>
                        {/* Lighting Fix: Match CSS top-left source */}
                        <ambientLight intensity={0.4} />
                        <spotLight position={[-10, 10, 5]} angle={0.5} penumbra={1} intensity={5} color={currentPlatform.color} />
                        <pointLight position={[10, -5, -5]} intensity={0.5} color="#ffffff" />
                        
                        <Stars radius={50} count={1000} factor={4} fade speed={1} />
                        
                        <HeroArtifact 
                            platform={currentPlatform.id} 
                            color={currentPlatform.color} 
                            lookAtTarget={hoveredSection}
                        />
                        <ContactShadows resolution={512} scale={10} blur={2} opacity={0.5} far={10} color="#000000" />
                        <Environment preset="city" />
                    </Canvas>
                </div>
            </BentoCard>

            {/* 2. Platform Selector - Spans 4 Columns */}
            <BentoCard 
                className="md:col-span-12 lg:col-span-4 row-span-2 p-6 flex flex-col gap-4"
                onMouseEnter={() => setHoveredSection('selector')}
                onMouseLeave={() => setHoveredSection(null)}
            >
                <h3 className="text-sm font-mono uppercase text-gray-500 mb-2">Select Platform</h3>
                {platforms.map((p, idx) => (
                    <button
                        key={p.id}
                        onClick={() => { setSelectedIdx(idx); soundManager.playHover(); }}
                        className={`
                            group flex items-center gap-4 p-4 rounded-xl border transition-all duration-300
                            ${idx === selectedIdx 
                                ? 'bg-white/10 border-white/40 shadow-lg' 
                                : 'bg-transparent border-transparent hover:bg-white/5'
                            }
                        `}
                    >
                        <div className={`p-2 rounded-lg ${idx === selectedIdx ? 'bg-white text-black' : 'bg-white/5 text-gray-400 group-hover:text-white'}`}>
                            <p.icon size={20} />
                        </div>
                        <div className="text-left">
                            <div className={`font-bold ${idx === selectedIdx ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                {p.title}
                            </div>
                            <div className="text-[10px] text-gray-600 font-mono">v{p.version}</div>
                        </div>
                        {idx === selectedIdx && <ChevronRight className="ml-auto text-white/50" size={16} />}
                    </button>
                ))}
            </BentoCard>

            {/* 3. Download Action Card - Spans 8 Columns */}
            <BentoCard 
                className="md:col-span-12 lg:col-span-8 p-8 flex flex-col md:flex-row items-center justify-between gap-6 group"
                onMouseEnter={() => setHoveredSection('download')}
                onMouseLeave={() => setHoveredSection(null)}
            >
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Ready to Initialize?</h2>
                    <p className="text-gray-400 text-sm">Download the latest {currentPlatform.title} build securely.</p>
                </div>
                <button 
                    onClick={() => setShowDownload(true)}
                    className="relative px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] overflow-hidden"
                >
                    <Download size={20} />
                    <span>Download Installer</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </button>
            </BentoCard>

            {/* 4. Stats Card - Spans 2 Columns */}
            <BentoCard className="md:col-span-6 lg:col-span-2 p-6 flex flex-col justify-center items-center text-center">
                 <div className="flex items-center gap-1 text-yellow-400 mb-2">
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                 </div>
                 <div className="text-3xl font-bold text-white mb-1">4.9/5</div>
                 <div className="text-xs text-gray-500 uppercase tracking-widest">User Rating</div>
            </BentoCard>

            {/* 5. Live Meg Log (Replaces Version History) - Spans 2 Columns */}
            <BentoCard className="md:col-span-6 lg:col-span-2 p-4">
                 <MegLog hoveredSection={hoveredSection} platform={currentPlatform.title} />
            </BentoCard>

        </div>
      </div>

      <DownloadSequence 
            isOpen={showDownload} 
            onClose={() => setShowDownload(false)} 
            platform={currentPlatform.title} 
      />
    </Layout>
  );
}
