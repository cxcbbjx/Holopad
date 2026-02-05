import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FadeIn from "../ui/FadeIn";
import { useSound } from "../utils/SoundManager";
import { renderHologram } from "../utils/HologramEngine";
import { CONFIG } from "../config";

export default function Viewer() {
  const mountRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Defensive: clean URLs from state
  const rawState = location.state || {};
  const image = rawState.image;
  const incomingModelUrl = rawState.modelUrl?.trim();
  const overlayUrl = rawState.overlayUrl?.trim();
  const persona = rawState.persona;
  const compareModelUrl = rawState.compareModelUrl?.trim();

  const errorRef = useRef(null);
  useSound();
  const [activeModelUrl, setActiveModelUrl] = useState(incomingModelUrl);
  const uploadAttempted = useRef(false);

  // Auto-upload image to backend for processing & logging (MongoDB)
  useEffect(() => {
    if (image && !activeModelUrl && !uploadAttempted.current) {
        uploadAttempted.current = true;
        const upload = async () => {
            try {
                const fd = new FormData();
                fd.append("image", image);
                // Optional: add metadata
                fd.append("author", "ViewerUser"); 
                
                const res = await fetch("/api/upload", { method: "POST", body: fd });
                const data = await res.json();
                
                if (data.modelUrl) {
                    setActiveModelUrl(data.modelUrl);
                }
            } catch(e) {
                console.error("Auto-upload failed:", e);
                // MongoDB logs failure via backend
            }
        };
        upload();
    }
  }, [image, activeModelUrl]);
  const [split, setSplit] = useState(!!compareModelUrl);
  const [flipY, setFlipY] = useState(false);
  const [rot180, setRot180] = useState(false);
  const [wow, setWow] = useState(true);
  const [alignX, setAlignX] = useState(0.0);
  const [alignY, setAlignY] = useState(0.0);
  const [zoom, setZoom] = useState(1.0);
  const [creative, setCreative] = useState(false);
  const [tool, setTool] = useState("cube");
  const [brushActive, setBrushActive] = useState(false);
  const [webcam, setWebcam] = useState(false);
  const [mirrorX, setMirrorX] = useState(false);
  const [mirrorZ, setMirrorZ] = useState(false);
  const [smartStack, setSmartStack] = useState(true);
  
  const videoRef = useRef(null);
  const handReadyRef = useRef(false);
  const stateRef = useRef({ tool, creative, brushActive, mirrorX, mirrorZ, smartStack });
  const voxelDataRef = useRef([]);
  const apiRef = useRef(null);
  
  const [voiceActive, setVoiceActive] = useState(false);
  const [projectStats, setProjectStats] = useState({ count: 0, value: 50 });
  const [isPro, setIsPro] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Init User to check tokens/role
    const initUser = async () => {
        try {
            const deviceId = localStorage.getItem('holo_device_id') || 'unknown';
            const res = await fetch("/api/user/init", {
                method: "POST",
                headers: { 
                    "x-device-id": deviceId,
                    "x-role": localStorage.getItem('holo_dev_mode') === 'true' ? 'developer' : 'user'
                }
            });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const u = await res.json();
            setUser(u);
        } catch(e) { console.error(e); }
    };
    initUser();
  }, []);

  const handleSave = async () => {
      if (!apiRef.current || !apiRef.current.exportOBJ) return;
      
      // 1. Check/Deduct Tokens
      try {
          const deviceId = localStorage.getItem('holo_device_id');
          const res = await fetch("/api/actions/save", {
              method: "POST",
              headers: { "x-device-id": deviceId, "x-role": user?.role }
          });
          const data = await res.json();
          
          if (!res.ok) {
              if (res.status === 402) {
                  alert(data.error); 
                  setShowPaywall(true); // Reuse paywall for "Buy Tokens"
                  return;
              }
              throw new Error(data.error);
          }
          
          // Update local tokens
          if (data.tokens !== undefined) setUser(u => ({ ...u, tokens: data.tokens }));
          
          // 2. Export & Download
          const blob = apiRef.current.exportOBJ();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `holopad_creation_${Date.now()}.obj`;
          a.click();
          URL.revokeObjectURL(url);
          
          alert("Saved to disk!");
      } catch (e) {
          alert("Save failed: " + e.message);
      }
  };

  const handleSell = async () => {
      if (!apiRef.current || !apiRef.current.exportOBJ) return;
      
      const name = prompt("Name your creation:");
      if (!name) return;
      const price = prompt("Set price (e.g. $5 or Free):", "$5");
      if (!price) return;
      
      try {
          const blob = apiRef.current.exportOBJ();
          const fd = new FormData();
          fd.append("model", blob, "model.obj");
          fd.append("name", name);
          fd.append("price", price);
          
          const deviceId = localStorage.getItem('holo_device_id');
          const res = await fetch("/api/market/list", {
              method: "POST",
              headers: { "x-device-id": deviceId, "x-role": user?.role },
              body: fd
          });
          const data = await res.json();
          
          if (!res.ok) {
              if (res.status === 402) {
                  alert(data.error);
                  setShowPaywall(true);
                  return;
              }
              throw new Error(data.error);
          }

          alert("Listed on Market successfully!");
      } catch (e) {
          alert("Listing failed: " + e.message);
      }
  };

  // Chat / Persona State
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [isListening, setIsListening] = useState(false);

  // Speech Recognition Setup
  const recognitionRef = useRef(null);
  
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US'; // Or Hindi 'hi-IN' if preferred
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMsg(transcript);
        handleSend(transcript);
      };
      
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  // Vision Pulse (Environmental Awareness)
  const handleVision = async () => {
    try {
      // Use DisplayMedia for Desktop "Vision"
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      
      // Capture frame using hidden video/canvas
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      
      // Wait for frame
      await new Promise(r => setTimeout(r, 500));
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Stop stream immediately after capture
      track.stop();
      video.srcObject = null;
      
      // Convert to blob
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8));
      const fd = new FormData();
      fd.append('image', blob);
      
      speak("Analyzing your environment...");
      
      // Send to "Brain"
      const res = await fetch('/api/vision', { method: 'POST', body: fd });
      const data = await res.json();
      
      if (data.response) {
        setMessages(prev => [...prev, { sender: 'Meg', text: data.response }]);
        speak(data.response);
        
        // Sync Mood with Vision
        if (apiRef.current && data.mood) {
           apiRef.current.setMood(data.mood, data.blush_intensity, data.vertex_warp);
        }
      }
      
    } catch (e) {
      console.error("Vision failed", e);
      speak("I couldn't see that. Try again.");
    }
  };

  useEffect(() => {
    if (persona === 'tsundere' && activeModelUrl) {
       // Trigger greeting on load
       // Small delay to ensure model is visible
       setTimeout(() => {
         fetch('/api/chat', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ message: "MEET_MEG_INIT", persona: 'tsundere' })
         })
         .then(r => r.json())
         .then(data => {
           if (data.response) {
              setMessages(prev => [...prev, { sender: 'Meg', text: data.response }]);
              speak(data.response);
           }
         });
       }, 2000);
    }
  }, [persona, activeModelUrl]);

  // --- PROACTIVE "GHOST" INTERACTION ---
  const lastActivity = useRef(Date.now());
  
  useEffect(() => {
      const resetIdle = () => lastActivity.current = Date.now();
      window.addEventListener("mousemove", resetIdle);
      window.addEventListener("keydown", resetIdle);
      window.addEventListener("click", resetIdle);

      const interval = setInterval(async () => {
         const idleTime = Date.now() - lastActivity.current;
         // 4 Hours = 14,400,000 ms. 
         // Trigger if user is silent/idle for too long.
         if (idleTime > 14400000) { 
             try {
                 console.log("[Meg] User is idle. Poking...");
                 const res = await fetch('/api/proactive');
                 const data = await res.json();
                 if (data.response) {
                     speak(data.response);
                     setMessages(prev => [...prev, { sender: 'Meg', text: data.response }]);
                     if (apiRef.current) {
                         apiRef.current.setMood(data.mood, data.blush_intensity, data.vertex_warp);
                     }
                 }
                 lastActivity.current = Date.now(); // Reset to avoid spam
             } catch(e) { console.error("Proactive fetch failed", e); }
         }
      }, 60000); // Check every minute

      return () => {
          window.removeEventListener("mousemove", resetIdle);
          window.removeEventListener("keydown", resetIdle);
          window.removeEventListener("click", resetIdle);
          clearInterval(interval);
      };
  }, []);

  const speak = (text) => {
    const u = new SpeechSynthesisUtterance(text);
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.name.includes("Female") || v.name.includes("Google US English"));
    if (femaleVoice) u.voice = femaleVoice;
    window.speechSynthesis.speak(u);
  };

  // Call / Meeting State
  const [callStatus, setCallStatus] = useState("idle");
  const [meetingStatus, setMeetingStatus] = useState("idle");

  const handleAction = async (type, action) => {
    try {
      // Optimistic UI
      if (type === 'call') {
        setCallStatus(action === 'start' || action === 'answer' ? 'connected' : 'idle');
      } else if (type === 'meeting') {
        setMeetingStatus(action === 'join' ? 'active' : 'idle');
      }

      const res = await fetch('http://localhost:5000/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, action })
      });
      const data = await res.json();
      
      // System Message
      setMessages(prev => [...prev, { sender: 'bot', text: `[System] ${data.message}` }]);
      speak(data.message, "professional");

    } catch (e) {
      console.error(e);
      // Revert on error
      if (type === 'call') setCallStatus('idle');
      if (type === 'meeting') setMeetingStatus('idle');
    }
  };

  const handleSend = async (txt = inputMsg) => {
    if (!txt.trim()) return;
    
    // Add User Message
    const newMsgs = [...messages, { sender: 'user', text: txt }];
    setMessages(newMsgs);
    setInputMsg("");

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: txt, persona: persona || "Assistant" })
      });
      const data = await res.json();
      
      // Add Bot Reply
      setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
      speak(data.reply);
      
      // Visual Pulse and Mood Update
      if (apiRef.current) {
         apiRef.current.setMood(data.mood);
      }
      
    } catch (e) {
      console.error("Chat Error:", e);
    }
  };

  // Debug State
  const [debugInfo, setDebugInfo] = useState("");
  const pointerRef = useRef(null);

  useEffect(() => {
    stateRef.current = { tool, creative, brushActive, mirrorX, mirrorZ, smartStack };
  }, [tool, creative, brushActive, mirrorX, mirrorZ, smartStack]);

  useEffect(() => {
    if (location.state && location.state.creative) {
      setCreative(true);
    }
    if (!image && !activeModelUrl && !(location.state && location.state.creative)) {
      navigate('/second');
      return;
    }
    if (!mountRef.current) return;
    
    let api = null;
    const init = async () => { 
      api = await renderHologram({ 
        image, modelUrl: activeModelUrl, overlayUrl, persona, 
        onError: (msg) => { if (errorRef.current) errorRef.current.textContent = msg; }, 
        compareModelUrl, flipY, rot180, wow, alignX, alignY, zoom, 
        stateRef, voxelDataRef, setDebugInfo, pointerRef,
        onVoiceStateChange: setVoiceActive,
        onStatsChange: setProjectStats,
        onZoomChange: setZoom
      }, mountRef.current); 
      apiRef.current = api;
      // Sync initial webcam state
      if (api.setWebcam) api.setWebcam(webcam);
    };
    init();
    
    return () => { 
      if (api && api.dispose) api.dispose();
      else if (apiRef.current && apiRef.current.dispose) apiRef.current.dispose();
    };
  }, [image, activeModelUrl, overlayUrl, persona, compareModelUrl, flipY, rot180, wow, alignX, alignY, zoom, navigate]); 

  // Sync webcam state changes
  useEffect(() => {
    if (apiRef.current && apiRef.current.setWebcam) {
      apiRef.current.setWebcam(webcam);
    }
  }, [webcam]);

  // Auto-activate brush when selected
  useEffect(() => {
    if (tool === "brush") setBrushActive(true);
  }, [tool]);

  const [paymentModal, setPaymentModal] = useState(null);

  const handleBuyTokens = (amount, tokens) => {
      const upiLink = `upi://pay?pa=${CONFIG.UPI_ID}&pn=${CONFIG.UPI_NAME}&am=${amount}&cu=INR`;
      setPaymentModal({ amount, tokens, upiLink });
  };

  const confirmPayment = async () => {
      if (!paymentModal) return;
      const { amount, tokens } = paymentModal;

      try {
          const deviceId = localStorage.getItem('holo_device_id');
          const res = await fetch("/api/tokens/buy", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-device-id": deviceId },
              body: JSON.stringify({ amount, tokens })
          });
          const data = await res.json();
          setUser(u => ({ ...u, tokens: data.newBalance }));
          setShowPaywall(false);
          setPaymentModal(null);
          alert(`Payment Successful! Added ${tokens} Tokens.`);
      } catch(e) { 
          alert("Payment Failed"); 
      }
  };

  return (
    <div style={{ height: "100vh", position: "relative", background: "black", overflow: "hidden" }}>
      
      {/* Top Left: Back & Branding */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button 
          onClick={() => navigate('/second')}
          style={{
            background: 'rgba(20,20,20,0.6)', border: '1px solid rgba(255,255,255,0.2)', 
            color: 'white', padding: '8px 16px', borderRadius: '8px',
            cursor: 'pointer', fontSize: '14px', backdropFilter: 'blur(5px)'
          }}
        >
          ← Hub
        </button>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', letterSpacing: '1px' }}>
          HOLOPAD <span style={{ color: '#00f0ff' }}>PRO</span>
        </div>
      </div>

      {/* Top Right: Project Value & Actions */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
        <div style={{
          background: 'rgba(0,0,0,0.6)', border: '1px solid #ffd700', borderRadius: '8px',
          padding: '8px 12px', color: '#ffd700', fontSize: '14px', fontWeight: 'bold'
        }}>
          Project Value: ${projectStats.value}k
        </div>
        
        {/* Token Display */}
        {user && (
            <div style={{ color: '#00ff88', fontSize: '12px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px' }}>
                {user.role === 'developer' ? '∞ Tokens (Dev)' : `${user.tokens} Tokens`}
            </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSave} style={{
                background: '#00f0ff', border: 'none', borderRadius: '4px', padding: '8px 12px',
                fontWeight: 'bold', cursor: 'pointer'
            }}>
                Save ({user?.role === 'developer' ? 'Free' : `${CONFIG.COST_SAVE_EXPORT}T`})
            </button>
            <button onClick={handleSell} style={{
                background: '#ff0055', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 12px',
                fontWeight: 'bold', cursor: 'pointer'
            }}>
                Sell ({user?.role === 'developer' ? 'Free' : `${CONFIG.COST_MARKET_LIST}T`})
            </button>
        </div>
      </div>

      {/* Top Center: Mode Switch */}
      <div style={{ 
        position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', 
        zIndex: 10, display: 'flex', gap: 0,
        background: 'rgba(10,10,10,0.8)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)', overflow: 'hidden'
      }}>
        <button 
          onClick={() => setCreative(false)}
          style={{ 
            background: !creative ? '#00f0ff' : 'transparent', 
            border: 'none', 
            color: !creative ? '#000' : '#888', 
            padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >View</button>
        <button 
          onClick={() => setCreative(true)}
          style={{ 
            background: creative ? '#00f0ff' : 'transparent', 
            border: 'none', 
            color: creative ? '#000' : '#888', 
            padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >Design Space</button>
      </div>

      {/* Right Sidebar: Utility Tools */}
      <div style={{ position: 'absolute', top: 100, right: 20, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button 
          onClick={() => setWebcam(w => !w)}
          style={{ 
            width: '48px', height: '48px', borderRadius: '12px', 
            background: webcam ? '#00f0ff' : 'rgba(20,20,20,0.8)', 
            border: '1px solid rgba(255,255,255,0.2)', color: webcam ? '#000' : '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', transition: 'all 0.2s'
          }}
          title="Toggle AR Webcam"
        >
          📷
        </button>
        <button 
          onClick={() => apiRef.current?.toggleVoice()}
          style={{ 
            width: '48px', height: '48px', borderRadius: '12px', 
            background: voiceActive ? '#ff4444' : 'rgba(20,20,20,0.8)', 
            border: voiceActive ? '1px solid #ff4444' : '1px solid rgba(255,255,255,0.2)', 
            color: voiceActive ? '#fff' : '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', transition: 'all 0.2s',
            boxShadow: voiceActive ? '0 0 15px rgba(255,68,68,0.5)' : 'none'
          }}
          title="Ask Meg (Voice Assistant)"
        >
          {voiceActive ? '🎙' : '🎤'}
        </button>

        <div style={{ height: 20 }}></div>

        {/* Talk / Call Button */}
        <button 
          onClick={() => {
            setChatOpen(!chatOpen);
            if (!chatOpen) {
              speak(`Connecting to ${persona || "Assistant"}...`);
            }
          }}
          style={{ 
            width: '48px', height: '48px', borderRadius: '12px', 
            background: chatOpen ? '#00f0ff' : 'rgba(20,20,20,0.8)', 
            border: chatOpen ? '1px solid #00f0ff' : '1px solid rgba(255,255,255,0.2)', 
            color: chatOpen ? '#000' : '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', transition: 'all 0.2s',
            boxShadow: chatOpen ? '0 0 15px rgba(0,240,255,0.5)' : 'none'
          }}
          title="Call / Chat"
        >
          📞
        </button>

        <div style={{ height: 20 }}></div>

        {/* Zoom & Align Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(20,20,20,0.8)', borderRadius: '12px', padding: 4 }}>
          <button onClick={() => setAlignY(v => v + 0.05)} style={{ padding: 10, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} title="Move Up">▲</button>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }}></div>
          <button onClick={() => setAlignY(v => v - 0.05)} style={{ padding: 10, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} title="Move Down">▼</button>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }}></div>
          <button onClick={() => setZoom(z => z + 0.1)} style={{ padding: 10, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} title="Zoom In">+</button>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }}></div>
          <button onClick={() => setZoom(z => z - 0.1)} style={{ padding: 10, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} title="Zoom Out">-</button>
        </div>

        <div style={{ height: 20 }}></div>

        {/* Vision Control */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(20,20,20,0.8)', borderRadius: '12px', padding: 4 }}>
           <button onClick={handleVision} style={{ padding: 10, background: 'none', border: 'none', color: '#00f0ff', cursor: 'pointer', fontSize: '20px' }} title="Give Vision (Share Screen)">👁️</button>
        </div>

        <div style={{ height: 20 }}></div>

        {/* System / Platform Link */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(20,20,20,0.8)', borderRadius: '12px', padding: 4 }}>
           <button 
             onClick={() => navigate('/platforms')} 
             style={{ padding: 10, background: 'none', border: 'none', color: '#00f0ff', cursor: 'pointer', fontSize: '20px' }} 
             title="System Hub"
           >
             🖥️
           </button>
        </div>
      </div>

      {/* Chat Interface */}
      {chatOpen && (
        <div style={{
          position: 'absolute', bottom: 100, right: 20, width: 320, height: 400,
          background: 'rgba(10,10,15,0.95)', border: '1px solid #00f0ff',
          borderRadius: '16px', display: 'flex', flexDirection: 'column',
          backdropFilter: 'blur(10px)', boxShadow: '0 0 30px rgba(0,240,255,0.2)',
          overflow: 'hidden', zIndex: 50
        }}>
          {/* Header */}
          <div style={{ 
            padding: '16px', background: 'rgba(0,240,255,0.1)', borderBottom: '1px solid rgba(0,240,255,0.2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontWeight: 'bold', color: '#00f0ff' }}>{persona || "Personal Assistant"}</span>
            <span style={{ fontSize: 12, color: '#888' }}>● Online</span>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', gap: 8, padding: 8, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
             <button 
                onClick={() => handleAction('call', callStatus === 'idle' ? 'start' : 'end')}
                style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                    background: callStatus === 'connected' ? '#ff4444' : '#333',
                    color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all 0.2s'
                }}
             >
                {callStatus === 'connected' ? 'End Call' : '📞 Call'}
             </button>
             <button 
                onClick={() => handleAction('meeting', meetingStatus === 'idle' ? 'join' : 'leave')}
                style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                    background: meetingStatus === 'active' ? '#00f0ff' : '#333',
                    color: meetingStatus === 'active' ? '#000' : '#fff', cursor: 'pointer', fontSize: 12, transition: 'all 0.2s'
                }}
             >
                {meetingStatus === 'active' ? 'Leave Mtg' : '📅 Join Mtg'}
             </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#666', marginTop: 40 }}>
                Start speaking or typing...
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ 
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                padding: '8px 12px',
                borderRadius: '12px',
                background: m.sender === 'user' ? '#00f0ff' : '#222',
                color: m.sender === 'user' ? '#000' : '#fff',
                border: m.sender === 'bot' ? '1px solid #444' : 'none',
                fontSize: 14
              }}>
                {m.text}
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 8 }}>
            <button 
              onClick={toggleListening}
              style={{
                background: isListening ? '#ff4444' : 'rgba(255,255,255,0.1)',
                border: 'none', borderRadius: '50%', width: 40, height: 40,
                color: '#fff', cursor: 'pointer', flexShrink: 0
              }}
            >
              {isListening ? '🛑' : '🎙'}
            </button>
            <input 
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              style={{
                flex: 1, background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: 20,
                padding: '0 16px', color: '#fff', outline: 'none'
              }}
            />
            <button 
              onClick={() => handleSend()}
              style={{
                background: '#00f0ff', border: 'none', borderRadius: '50%', width: 40, height: 40,
                color: '#000', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Design Toolbar (Bottom) - Only in Creative Mode */}
      {creative && (
        <div style={{ 
          position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', 
          zIndex: 10, display: 'flex', gap: 16, alignItems: 'center',
          background: 'rgba(15,15,15,0.9)', padding: '12px 24px', borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          {/* Tools */}
          <div style={{ display: 'flex', gap: 8 }}>
            {['cube', 'voxel', 'sphere', 'pyramid'].map(t => (
              <button
                key={t}
                onClick={() => setTool(t)}
                style={{
                  background: tool === t ? 'rgba(0,240,255,0.2)' : 'transparent',
                  border: tool === t ? '1px solid #00f0ff' : '1px solid transparent',
                  color: tool === t ? '#00f0ff' : '#888',
                  padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                  textTransform: 'capitalize', fontWeight: 'bold'
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)' }}></div>

          {/* Symmetry */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              onClick={() => setMirrorX(m => !m)}
              style={{ 
                color: mirrorX ? '#00f0ff' : '#888', 
                background: mirrorX ? 'rgba(0,240,255,0.1)' : 'transparent', 
                border: '1px solid transparent', borderRadius: '8px', padding: '8px',
                cursor: 'pointer' 
              }}
              title="Mirror X Axis"
            >
              ↔ Sym-X
            </button>
            <button 
              onClick={() => setMirrorZ(m => !m)}
              style={{ 
                color: mirrorZ ? '#00f0ff' : '#888', 
                background: mirrorZ ? 'rgba(0,240,255,0.1)' : 'transparent', 
                border: '1px solid transparent', borderRadius: '8px', padding: '8px',
                cursor: 'pointer' 
              }}
              title="Mirror Z Axis"
            >
              ↕ Sym-Z
            </button>
            <button 
              onClick={() => setSmartStack(s => !s)}
              style={{ 
                color: smartStack ? '#00f0ff' : '#888', 
                background: smartStack ? 'rgba(0,240,255,0.1)' : 'transparent', 
                border: '1px solid transparent', borderRadius: '8px', padding: '8px',
                cursor: 'pointer' 
              }}
              title="Smart Stacking"
            >
              🥞 Stack
            </button>
          </div>

          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)' }}></div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => apiRef.current?.undo()} style={{ color: '#ffaa00', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }} title="Undo">↩</button>
            <button onClick={() => apiRef.current?.clearVoxels()} style={{ color: '#ff4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }} title="Clear All">🗑</button>
          </div>

          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)' }}></div>

          {/* Save */}
          <button 
            onClick={() => {
              if (!isPro) { setShowPaywall(true); return; }
              apiRef.current?.exportVoxels();
            }} 
            style={{ 
              background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', 
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <span>⬇</span> Save
            {!isPro && <span style={{fontSize:'10px', background:'#ffaa00', color:'#000', padding:'2px 4px', borderRadius:'4px'}}>PRO</span>}
          </button>

          {/* Sell Button */}
          <button 
            onClick={() => {
              if (!isPro) { setShowPaywall(true); return; }
              alert(`🚀 Project listed on Global HoloMarket for ₹${projectStats.value}!\n\nClient Matching in progress...`);
            }} 
            style={{ 
              background: 'linear-gradient(90deg, #00f0ff, #00ff88)', color: '#000', border: 'none', 
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 0 15px rgba(0,255,136,0.4)'
            }}
          >
            <span>$</span> SELL
            {!isPro && <span style={{fontSize:'10px', background:'#000', color:'#fff', padding:'2px 4px', borderRadius:'4px'}}>LOCKED</span>}
          </button>
        </div>
      )}

      {/* Token Shop / Paywall Modal */}
      {showPaywall && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
            border: '1px solid #ffd700', borderRadius: '24px', padding: '40px',
            width: '90%', maxWidth: '500px', textAlign: 'center',
            boxShadow: '0 0 50px rgba(255, 215, 0, 0.2)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🪙</div>
            <h2 style={{ fontSize: '32px', margin: '0 0 10px 0', color: '#fff' }}>Need More Tokens?</h2>
            <p style={{ color: '#888', marginBottom: '30px' }}>
              Top up your wallet to Save, Sell, and Chat with Meg.
            </p>

            <div style={{ display: 'grid', gap: '15px', marginBottom: '30px' }}>
                <button onClick={() => handleBuyTokens(CONFIG.PACK_BASIC.price_inr, CONFIG.PACK_BASIC.tokens)} style={{ 
                    padding: '16px', background: '#222', border: '1px solid #444', 
                    color: '#fff', borderRadius: '12px', cursor: 'pointer', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '16px'
                }}>
                    <div style={{textAlign:'left'}}>
                        <div style={{fontWeight:'bold'}}>{CONFIG.PACK_BASIC.tokens} Tokens</div>
                        <div style={{fontSize:'12px', color:'#888'}}>Basic Pack</div>
                    </div>
                    <span style={{ color: '#00ff88', fontWeight:'bold' }}>₹{CONFIG.PACK_BASIC.price_inr}</span>
                </button>

                <button onClick={() => handleBuyTokens(CONFIG.PACK_PRO.price_inr, CONFIG.PACK_PRO.tokens)} style={{ 
                    padding: '16px', background: 'linear-gradient(90deg, #222, #333)', 
                    border: '1px solid #ffd700', color: '#fff', borderRadius: '12px', cursor: 'pointer', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '16px', boxShadow: '0 0 15px rgba(255, 215, 0, 0.1)'
                }}>
                    <div style={{textAlign:'left'}}>
                        <div style={{fontWeight:'bold', color:'#ffd700'}}>{CONFIG.PACK_PRO.tokens} Tokens</div>
                        <div style={{fontSize:'12px', color:'#888'}}>Pro Creator Value</div>
                    </div>
                    <span style={{ color: '#00ff88', fontWeight:'bold' }}>₹{CONFIG.PACK_PRO.price_inr}</span>
                </button>
            </div>
            
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '20px' }}>
                Secure Payment via GPay (UPI ID: {CONFIG.UPI_ID})
            </div>

            <button 
              onClick={() => setShowPaywall(false)}
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

      {/* Payment Modal */}
      {paymentModal && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(15px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center'
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
                style={{ 
                    width: '100%', padding: '16px', background: '#00ff88', border: 'none', 
                    color: '#000', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px',
                    marginBottom: '15px'
                }}
            >
                I Have Made Payment
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

      {/* HOLOGRAM STAGE */}
      <div
        ref={mountRef}
        style={{
          height: "100%",
          width: "100%",
        }}
      />
      
      <div ref={errorRef} style={{ position: "absolute", top: 20, right: 20, color: "#ff6666", fontSize: 12 }} />
      
      {/* 2D Debug Pointer */}
      <div 
        ref={pointerRef}
        style={{
          position: 'absolute', width: '20px', height: '20px',
          background: 'rgba(0, 240, 255, 0.5)', border: '2px solid #00f0ff',
          borderRadius: '50%', transform: 'translate(-50%, -50%)',
          pointerEvents: 'none', display: 'none', zIndex: 9999
        }}
      />

      {/* Meg Assistant Overlay */}
      <div style={{
        position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
        background: debugInfo ? 'rgba(10,10,20,0.95)' : 'transparent', 
        border: debugInfo ? '1px solid rgba(0,240,255,0.3)' : 'none',
        color: '#00f0ff', padding: debugInfo ? '12px 24px' : '0',
        fontSize: '14px', fontFamily: '"Segoe UI", sans-serif', borderRadius: '24px',
        pointerEvents: 'none', whiteSpace: 'pre-wrap', textAlign: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', opacity: debugInfo ? 1 : 0,
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: debugInfo ? '0 0 30px rgba(0,240,255,0.25)' : 'none',
        backdropFilter: 'blur(10px)', minWidth: '300px', justifyContent: 'center'
      }}>
        {debugInfo && (
          <>
            <div style={{ 
              fontSize: '24px', filter: 'drop-shadow(0 0 10px rgba(0,240,255,0.8))',
              animation: 'pulse 2s infinite'
            }}>🤖</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Meg AI Assistant</span>
              <span>{debugInfo}</span>
            </div>
          </>
        )}
      </div>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
