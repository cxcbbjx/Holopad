import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useNavigate } from "react-router-dom";
import { useSound, soundManager } from "../utils/SoundManager";
import { CONFIG } from '../config';
import "../styles/theme.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const vertexShader = `
varying vec2 vUv;
varying float vElevation;
uniform float uTime;
uniform vec2 uMouse;

void main() {
  vUv = uv;
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  float elevation = sin(modelPosition.x * 2.0 + uTime * 0.5) *
                    sin(modelPosition.y * 2.0 + uTime * 0.5) * 0.2;
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
  float mixStrength = (vElevation + 0.25) * 2.0;
  vec3 color = mix(uColorA, uColorB, mixStrength);
  float grid = step(0.98, max(sin(vUv.x * 50.0), sin(vUv.y * 50.0)));
  color += grid * 0.5;
  gl_FragColor = vec4(color, 1.0);
}
`;

const FluidPlane = () => {
  const mesh = useRef();
  const { viewport, pointer } = useThree();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColorA: { value: new THREE.Color("#1a1a2e") },
      uColorB: { value: new THREE.Color("#e94560") }
    }),
    []
  );
  useFrame((state) => {
    const { clock } = state;
    if (mesh.current) {
      mesh.current.material.uniforms.uTime.value = clock.getElapsedTime();
      mesh.current.material.uniforms.uMouse.value.lerp(
        new THREE.Vector2(pointer.x * 0.5 + 0.5, pointer.y * 0.5 + 0.5),
        0.1
      );
    }
  });
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[viewport.width * 1.5, viewport.height * 1.5, 128, 128]} />
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} side={THREE.DoubleSide} />
    </mesh>
  );
};

const SceneContent = () => {
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(time * 0.1) * 0.5;
    state.camera.position.y = Math.cos(time * 0.1) * 0.5;
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 5, 0.05);
    state.camera.lookAt(0, 0, 0);
  });
  return (
    <>
      <FluidPlane />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
    </>
  );
};

const Overlay = () => {
  const navigate = useNavigate();
  const [devClicks, setDevClicks] = useState(0);
  const titleRef = useRef();
  const subRef = useRef();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [modelUrl, setModelUrl] = useState(null);
  
  // Market State
  const [showMarket, setShowMarket] = useState(false);
  const [marketItems, setMarketItems] = useState([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [viewMode, setViewMode] = useState('buy');
  const [sellForm, setSellForm] = useState({ name: '', price: '', file: null });
  
  // User & Economy State
  const [user, setUser] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState(0);

  useEffect(() => {
    (async () => {
      // Init User
      try {
        const deviceId = localStorage.getItem('holo_device_id') || `dev_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('holo_device_id', deviceId);
        
        const res = await fetch(`${API_BASE}/api/user/init`, {
            method: "POST",
            headers: { 
                "x-device-id": deviceId,
                "x-role": localStorage.getItem('holo_dev_mode') === 'true' ? 'developer' : 'user'
            }
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const u = await res.json();
        setUser(u);
      } catch(e) { console.error("SecondPage User Init Error:", e); }

      if (!window.customElements.get('model-viewer')) {
        await import('@google/model-viewer');
      }
    })();
    soundManager.startAmbient();
    gsap.fromTo(titleRef.current, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.5, ease: "power3.out", delay: 0.5 });
    gsap.fromTo(subRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.5, ease: "power3.out", delay: 0.8 });
  }, []);

  const toggleDevMode = async () => {
      const isDev = localStorage.getItem('holo_dev_mode') === 'true';
      if (!isDev) {
          const pass = prompt("Enter Developer Password:");
          if (pass === CONFIG.DEV_PASSWORD) {
              localStorage.setItem('holo_dev_mode', 'true');
              alert("Dev Mode ON: Unlimited Tokens & Free Market");
              window.location.reload();
          }
      } else {
          localStorage.setItem('holo_dev_mode', 'false');
          window.location.reload();
      }
  };

  const [paymentModal, setPaymentModal] = useState(null);

  const handleBuyTokens = (amount, tokens) => {
      const upiLink = `upi://pay?pa=${CONFIG.UPI_ID}&pn=${CONFIG.UPI_NAME}&am=${amount}&cu=INR`;
      setPaymentModal({ amount, tokens, upiLink });
  };

  const confirmPayment = async () => {
      if (!paymentModal) return;
      const { amount, tokens } = paymentModal;
      setLoading(true);
      
      try {
        const deviceId = localStorage.getItem('holo_device_id');
        const res = await fetch(`${API_BASE}/api/tokens/buy`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-device-id": deviceId },
            body: JSON.stringify({ amount, tokens })
        });
        const data = await res.json();
        setUser(u => ({ ...u, tokens: data.newBalance, walletBalance: data.newWallet }));
        setShowPayModal(false);
        setPaymentModal(null);
        alert(`Payment Successful! Added ${tokens} Tokens.`);
      } catch(e) { alert("Payment Failed"); }
      setLoading(false);
  };

  const onPickFile = () => {
    soundManager.playClick();
    fileInputRef.current?.click();
  };
  const onTryCreative = () => {
    navigate('/viewer', { state: { creative: true } });
  };

  const onMarketClick = async () => {
    soundManager.playClick();
    setShowMarket(true);
    setViewMode('buy');
    setMarketLoading(true);
    try {
        const res = await fetch(`${API_BASE}/api/market`);
        const data = await res.json();
        setMarketItems(data);
    } catch (e) {
        console.error("Market error", e);
    }
    setMarketLoading(false);
  };

  const onSellSubmit = async () => {
    if (!sellForm.file) return alert("Please select an image");
    setLoading(true);
    
    const fd = new FormData();
    fd.append("image", sellForm.file);
    fd.append("name", sellForm.name);
    fd.append("price", sellForm.price);
    fd.append("author", "Me"); // Mock user
    
    try {
        const r = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: fd });
        if (!r.ok) throw new Error("Upload failed");
        alert("Listed successfully!");
        setSellForm({ name: '', price: '', file: null });
        onMarketClick(); // Refresh list and switch to buy view
    } catch(e) {
        alert(e.message);
    }
    setLoading(false);
  };

  const onFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", f);
      // Use relative path via proxy
      const r = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: fd });
      
      if (!r.ok) {
        throw new Error(`Server error: ${r.status}`);
      }

      const j = await r.json();
      if (j?.error) {
        throw new Error(j.error);
      }
      
      if (j?.modelUrl) {
        // Defensive: Clean URL to prevent double-protocol or space injection
        const cleanUrl = j.modelUrl.trim();
        setModelUrl(cleanUrl);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed: " + err.message);
    }
    setLoading(false);
  };
  const onBuyItem = async (item) => {
    if (item.price === "Not for Sale") return;
    const priceVal = parseFloat(item.price.replace('$', '')) || 0;
    
    // Check if user owns it or free
    if (priceVal > 0 && user?.role !== 'developer') {
        if ((user?.walletBalance || 0) < priceVal) {
            alert("Insufficient Wallet Balance. Please Add Funds.");
            setShowPayModal(true);
            return;
        }
        if (!confirm(`Buy ${item.name} for ${item.price}?`)) return;
    }
    
    try {
        const deviceId = localStorage.getItem('holo_device_id');
        const res = await fetch(`${API_BASE}/api/market/buy`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-device-id": deviceId },
            body: JSON.stringify({ itemId: item.id, price: item.price })
        });
        const d = await res.json();
        if (d.success) {
            // Update local balance
             if (user.role !== 'developer' && priceVal > 0) {
                 setUser(u => ({ ...u, walletBalance: u.walletBalance - priceVal }));
             }
            navigate('/viewer', { state: { modelUrl: item.url, persona: item.name.includes("Meg") ? 'tsundere' : 'default' } });
        } else {
            alert(d.error);
        }
    } catch(e) { console.error(e); }
  };

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "white", zIndex: 9999 }}>
      
      {/* Payment Modal */}
      {paymentModal && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(15px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'auto'
        }}>
          <div style={{
            background: '#111', border: '1px solid #00ff88', borderRadius: '24px', padding: '40px',
            width: '90%', maxWidth: '400px', textAlign: 'center',
            boxShadow: '0 0 50px rgba(0, 255, 136, 0.2)'
          }}>
            <h2 style={{ fontSize: '24px', margin: '0 0 20px 0', color: '#fff' }}>Scan to Pay</h2>
            
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', display: 'inline-block', marginBottom: '20px' }}>
                <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentModal.upiLink)}`} 
                    alt="UPI QR Code" 
                    style={{ width: '200px', height: '200px' }}
                />
            </div>

            <div style={{ fontSize: '20px', color: '#00ff88', fontWeight: 'bold', marginBottom: '10px' }}>
                ₹{paymentModal.amount}
            </div>
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '30px' }}>
                UPI ID: <span style={{ color: '#fff' }}>{CONFIG.UPI_ID}</span>
            </div>

            <button 
                onClick={confirmPayment}
                disabled={loading}
                style={{ 
                    width: '100%', padding: '16px', background: '#00ff88', border: 'none', 
                    color: '#000', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px',
                    marginBottom: '15px', opacity: loading ? 0.7 : 1
                }}
            >
                {loading ? "Verifying..." : "I Have Made Payment"}
            </button>

            <button 
                onClick={() => setPaymentModal(null)}
                style={{
                    background: 'none', border: 'none', color: '#666',
                    cursor: 'pointer', textDecoration: 'underline'
                }}
            >
                Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
          <div style={{ position: 'absolute', zIndex: 9999, top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'auto' }}>
              <div style={{ background: '#111', border: '1px solid #00ff88', padding: '30px', borderRadius: '15px', width: '400px', textAlign: 'center', boxShadow: '0 0 30px rgba(0,255,136,0.3)' }}>
                  <h3 style={{ color: '#00ff88', marginBottom: '20px' }}>Add Funds / Buy Tokens</h3>
                  <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                      <button onClick={() => handleBuyTokens(CONFIG.PACK_BASIC.price_inr, CONFIG.PACK_BASIC.tokens)} style={{ padding: '15px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{CONFIG.PACK_BASIC.tokens} Tokens + ${CONFIG.PACK_BASIC.tokens / 10} Wallet</span>
                          <span style={{ color: '#00ff88' }}>₹{CONFIG.PACK_BASIC.price_inr}</span>
                      </button>
                      <button onClick={() => handleBuyTokens(CONFIG.PACK_PRO.price_inr, CONFIG.PACK_PRO.tokens)} style={{ padding: '15px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{CONFIG.PACK_PRO.tokens} Tokens + ${CONFIG.PACK_PRO.tokens / 10} Wallet</span>
                          <span style={{ color: '#00ff88' }}>₹{CONFIG.PACK_PRO.price_inr}</span>
                      </button>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '20px' }}>Secure Payment via GPay (UPI ID: {CONFIG.UPI_ID})</div>
                  <button onClick={() => setShowPayModal(false)} style={{ background: 'transparent', border: '1px solid #fff', color: '#fff', padding: '8px 20px', borderRadius: '5px', cursor: 'pointer' }}>CANCEL</button>
              </div>
          </div>
      )}

      {!showMarket && (
        <>
            <h1 ref={titleRef} 
                onMouseEnter={() => soundManager.playHover()} 
                onClick={() => {
                    soundManager.playClick();
                    setDevClicks(p => {
                        if (p + 1 >= 5) {
                            toggleDevMode();
                            return 0;
                        }
                        return p + 1;
                    });
                }} 
                style={{ fontSize: "5rem", fontWeight: "bold", letterSpacing: "-0.05em", margin: 0, fontFamily: "'Helvetica Neue', sans-serif", pointerEvents: "auto", cursor: "pointer", textShadow: "0 0 20px rgba(0,0,0,0.5)" }}>
                HOLOSTAGE {user?.role === 'developer' && <span style={{ fontSize: '1rem', color: 'red', verticalAlign: 'top' }}>DEV</span>}
            </h1>
            <p ref={subRef} style={{ fontSize: "1.2rem", letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.8, textShadow: "0 0 10px rgba(0,0,0,0.5)" }}>Immersive Experience</p>
        </>
      )}

      {/* Market Modal */}
      {showMarket && (
        <div style={{ pointerEvents: 'auto', width: '85%', height: '80%', background: 'rgba(10,10,20,0.9)', backdropFilter: 'blur(20px)', border: '1px solid #00ff88', borderRadius: '20px', padding: '40px', display: 'flex', flexDirection: 'column', boxShadow: '0 0 50px rgba(0,255,136,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid rgba(0,255,136,0.3)', paddingBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#00ff88', fontSize: '2rem', letterSpacing: '2px' }}>HOLOMARKET</h2>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                        <span onClick={() => setViewMode('buy')} style={{ cursor: 'pointer', opacity: viewMode === 'buy' ? 1 : 0.5, borderBottom: viewMode === 'buy' ? '2px solid #00ff88' : 'none', paddingBottom: '5px', color: '#fff', fontSize: '1.2rem' }}>BUY</span>
                        <span onClick={() => setViewMode('sell')} style={{ cursor: 'pointer', opacity: viewMode === 'sell' ? 1 : 0.5, borderBottom: viewMode === 'sell' ? '2px solid #00ff88' : 'none', paddingBottom: '5px', color: '#fff', fontSize: '1.2rem' }}>SELL</span>
                    </div>
                </div>
                
                {user && (
                    <div style={{ textAlign: 'right', flex: 1, marginRight: '30px' }}>
                        <div style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '1.2rem' }}>
                            Wallet: ${user.walletBalance?.toFixed(2)}
                        </div>
                        <div style={{ color: '#00f0ff', fontSize: '0.9rem' }}>
                            Tokens: {user.tokens}
                        </div>
                        <button onClick={() => setShowPayModal(true)} style={{ marginTop: '5px', background: 'linear-gradient(90deg, #ff0055, #ff5500)', border: 'none', color: '#fff', padding: '5px 15px', fontSize: '0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+ ADD FUNDS</button>
                    </div>
                )}

                <button onClick={() => setShowMarket(false)} style={{ background: 'transparent', border: '1px solid #fff', color: '#fff', padding: '8px 20px', cursor: 'pointer', borderRadius: '5px', transition: 'all 0.3s' }}>CLOSE</button>
            </div>
            
            {viewMode === 'buy' ? (
                marketLoading ? (
                    <div style={{ color: '#fff', fontSize: '1.2rem', textAlign: 'center', marginTop: '50px' }}>Loading Holograms...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '25px', overflowY: 'auto', paddingRight: '10px' }}>
                        {marketItems.map(item => (
                            <div key={item.id} className="glass-panel" style={{ borderRadius: '12px', padding: '15px', border: '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.2s', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ height: '180px', background: 'radial-gradient(circle at center, #222, #000)', borderRadius: '8px', marginBottom: '15px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {item.thumbnail ? (
                                        <img src={item.thumbnail} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <span style={{ color: '#555', fontSize: '3rem' }}>🧊</span>
                                    )}
                                </div>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>{item.name}</h3>
                                <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '10px' }}>By {item.author}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                    <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '1.1rem' }}>{item.price}</span>
                                    <button 
                                        onClick={() => navigate('/viewer', { state: { modelUrl: item.url, persona: item.name.includes("Meg") ? 'tsundere' : 'default' } })}
                                        style={{ background: 'linear-gradient(45deg, #00ff88, #00cc6a)', color: '#000', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,255,136,0.2)' }}
                                    >
                                        GET
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: '100%', maxWidth: '500px', background: 'rgba(255,255,255,0.05)', padding: '40px', borderRadius: '20px', border: '1px solid rgba(0,255,136,0.3)' }}>
                        <h3 style={{ margin: '0 0 20px 0', color: '#fff', textAlign: 'center', fontSize: '1.5rem' }}>List Your Hologram</h3>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#aaa', marginBottom: '5px' }}>Hologram Name</label>
                            <input type="text" placeholder="e.g. Cyber Samurai" value={sellForm.name} onChange={e => setSellForm({...sellForm, name: e.target.value})} style={{ display: 'block', width: '100%', padding: '12px', background: 'rgba(0,0,0,0.5)', border: '1px solid #333', color: '#fff', borderRadius: '5px' }} />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: '#aaa', marginBottom: '5px' }}>Price</label>
                            <input type="text" placeholder="e.g. $5.00 or Free" value={sellForm.price} onChange={e => setSellForm({...sellForm, price: e.target.value})} style={{ display: 'block', width: '100%', padding: '12px', background: 'rgba(0,0,0,0.5)', border: '1px solid #333', color: '#fff', borderRadius: '5px' }} />
                        </div>
                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', color: '#aaa', marginBottom: '5px' }}>Image File</label>
                            <input type="file" onChange={e => setSellForm({...sellForm, file: e.target.files[0]})} style={{ display: 'block', width: '100%', padding: '10px', color: '#fff' }} />
                        </div>
                        <button onClick={onSellSubmit} disabled={loading} style={{ background: 'linear-gradient(45deg, #00ff88, #00cc6a)', color: '#000', padding: '15px', border: 'none', cursor: 'pointer', fontWeight: 'bold', width: '100%', borderRadius: '8px', fontSize: '1.1rem', opacity: loading ? 0.7 : 1 }}>
                            {loading ? "CREATING & LISTING..." : "LIST ITEM"}
                        </button>
                    </div>
                </div>
            )}
        </div>
      )}
      
      {/* Hide buttons when model is shown or market is open */}
      {!modelUrl && !showMarket && (
        <div style={{ display: "flex", gap: "14px", marginTop: "18px", pointerEvents: "auto", position: 'relative', zIndex: 10000 }}>
          <button onClick={onPickFile} className="glass-panel" style={{ padding: "10px 20px", borderColor: "var(--holo-blue)", color: "var(--holo-blue)", cursor: "pointer", backgroundColor: 'rgba(0,0,0,0.5)' }}>
            GET STARTED
          </button>
          <button onClick={() => navigate('/viewer', { state: { modelUrl: '/public/holo_1767775805158.glb', persona: 'tsundere' } })} className="glass-panel" style={{ padding: "10px 20px", borderColor: "#ff0055", color: "#ff0055", cursor: "pointer", backgroundColor: 'rgba(0,0,0,0.5)' }}>
            MEET MEG
          </button>
          <button onClick={onTryCreative} className="glass-panel" style={{ padding: "10px 20px", borderColor: "var(--holo-blue)", color: "var(--holo-blue)", cursor: "pointer", backgroundColor: 'rgba(0,0,0,0.5)' }}>
            Try Creative Space
          </button>
          <button onClick={onMarketClick} className="glass-panel" style={{ padding: "10px 20px", borderColor: "#00ff88", color: "#00ff88", cursor: "pointer", backgroundColor: 'rgba(0,0,0,0.5)' }}>
            $ Marketplace
          </button>
          {loading && <span className="mono-label" style={{ color: "var(--holo-blue)" }}>Uploading...</span>}
        </div>
      )}
      
      {/* Always render input so it can be triggered from anywhere */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: "none" }} />

      {modelUrl && (
        <div style={{ position: "absolute", bottom: "30px", width: "80%", maxWidth: "900px", height: "380px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(0,240,255,0.2)", pointerEvents: "auto", background: "rgba(0,0,0,0.4)", boxShadow: "0 0 30px rgba(0,240,255,0.25)" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(to bottom, rgba(0,240,255,0.06) 0px, rgba(0,240,255,0.06) 1px, transparent 6px)", pointerEvents: "none", mixBlendMode: "screen" }} />
          <model-viewer src={modelUrl} camera-controls auto-rotate tone-mapping="neutral" exposure="1.1" shadow-intensity="0.3" style={{ width: "100%", height: "100%", filter: "drop-shadow(0 0 10px rgba(0,240,255,0.6))" }} />
          
          <button 
            onClick={onPickFile}
            style={{
              position: 'absolute', bottom: 20, left: 20,
              padding: '12px 24px', background: 'rgba(0,0,0,0.6)', color: '#00f0ff',
              border: '1px solid #00f0ff', borderRadius: '8px', fontWeight: 'bold',
              cursor: 'pointer', boxShadow: '0 0 20px rgba(0,240,255,0.2)',
              zIndex: 100, backdropFilter: 'blur(5px)'
            }}
          >
            UPLOAD NEXT
          </button>

          <button 
            onClick={() => navigate('/viewer', { state: { modelUrl, creative: true } })}
            style={{
              position: 'absolute', bottom: 20, right: 20,
              padding: '12px 24px', background: '#00f0ff', color: '#000',
              border: 'none', borderRadius: '8px', fontWeight: 'bold',
              cursor: 'pointer', boxShadow: '0 0 20px rgba(0,240,255,0.4)',
              zIndex: 100
            }}
          >
            EDIT IN STUDIO →
          </button>
        </div>
      )}
    </div>
  );
};

export default function SecondPage() {
  useSound();
  useEffect(() => {
    // GSAP setup removed as sections are gone
  }, []);
  return (
    <div style={{ width: "100vw", background: "#000", position: "relative" }}>
      <section style={{ position: "relative", height: "100vh" }}>
        <Canvas dpr={[1, 2]} camera={{ position: [0, 2, 20], fov: 45 }} gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping }}>
          <SceneContent />
          <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.5} />
            <ChromaticAberration offset={[0.002, 0.002]} blendFunction={BlendFunction.NORMAL} />
            <Noise opacity={0.05} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Canvas>
        <Overlay />
      </section>
    </div>
  );
}
