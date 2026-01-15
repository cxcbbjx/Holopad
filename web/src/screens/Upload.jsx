import FadeIn from "../ui/FadeIn";
import GlowButton from "../ui/GlowButton";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Upload() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");

  const handleSelect = async (file) => {
    setLoading(true);
    setLoadingStep("Initializing quantum uplink...");
    await new Promise(r => setTimeout(r, 600));

    try {
      setLoadingStep("Segmenting subject...");
      const formData = new FormData();
      formData.append("image", file);

      setLoadingStep("Generating hologram mesh...");
      const response = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();

      setLoadingStep("Finalizing light transport...");
      await new Promise(r => setTimeout(r, 500));

      if (data.status === "ok") {
        navigate('/viewer', {
          state: {
            image: file,
            modelUrl: data.modelUrl,
            overlayUrl: data.overlayUrl,
            equationsUrl: data.equationsUrl
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
