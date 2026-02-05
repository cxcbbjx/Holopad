import FadeIn from "../ui/FadeIn";
import GlowButton from "../ui/GlowButton";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Upload() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [useML, setUseML] = useState(false);
  const [persona, setPersona] = useState("neon");
  const [use2D, setUse2D] = useState(false);

  const handleSelect = async (file) => {
    setLoading(true);
    setLoadingStep("Initializing quantum uplink...");
    await new Promise(r => setTimeout(r, 600));

    try {
      setLoadingStep("Segmenting subject...");
      const formData = new FormData();
      formData.append("image", file);

      setLoadingStep("Generating hologram mesh...");
      const endpoint = use2D
        ? "http://localhost:5000/api/holo2d"
        : (persona === "self"
            ? "http://localhost:5000/api/self"
            : (useML ? "http://localhost:5000/api/reconstruct" : "http://localhost:5000/api/upload"));
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();

      let compareModelUrl = null;
      if (persona === "self") {
        setLoadingStep("Preparing replica for compare...");
        const formData2 = new FormData();
        formData2.append("image", file);
        const r2 = await fetch("http://localhost:5000/api/upload", { method: "POST", body: formData2 });
        if (r2.ok) {
          const d2 = await r2.json();
          if (d2.status === "ok") {
            compareModelUrl = d2.modelUrl;
          }
        }
      }

      setLoadingStep("Finalizing light transport...");
      await new Promise(r => setTimeout(r, 500));

      if (data.status === "ok") {
        navigate('/viewer', {
          state: {
            image: file,
            modelUrl: data.modelUrl,
            overlayUrl: data.overlayUrl,
            equationsUrl: data.equationsUrl,
            persona,
            compareModelUrl
          }
        });
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      setLoadingStep("Error: " + err.message);
      setTimeout(() => setLoading(false), 1500);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
          color: "white",
          fontFamily: "monospace"
        }}
      >
        <div style={{
          width: 48, height: 48,
          border: "2px solid #333",
          borderTop: "2px solid #6EC1FF",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}/>
        <FadeIn key={loadingStep}>
          <div style={{ color: "#6EC1FF", letterSpacing: 1 }}>{loadingStep}</div>
        </FadeIn>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 28,
        textAlign: "center"
      }}
    >
      <FadeIn>
        <div style={{ fontSize: 20, letterSpacing: 0.4 }}>
          Upload an image
        </div>
      </FadeIn>

      <FadeIn delay={600}>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>
          This image will be transformed into light.
        </div>
      </FadeIn>

      <FadeIn delay={900}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", color: "var(--muted)" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={useML} onChange={(e) => setUseML(e.target.checked)} />
            Use ML reconstruction
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={use2D} onChange={(e) => setUse2D(e.target.checked)} />
            Use 2D Hologram
          </label>
          <select
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              padding: "8px 12px",
              borderRadius: 8
            }}
          >
            <option value="neon">Neon</option>
            <option value="replica">Replica</option>
            <option value="ai">AI Guide</option>
            <option value="self">Self</option>
          </select>
        </div>
      </FadeIn>

      <FadeIn delay={1200}>
        <label style={{ cursor: "pointer" }}>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files[0] && handleSelect(e.target.files[0])}
          />
          <GlowButton>
            Choose image
          </GlowButton>
        </label>
      </FadeIn>
    </div>
  );
}
