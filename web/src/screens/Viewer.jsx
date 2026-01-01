import { useEffect, useRef } from "react";
import * as THREE from "three";
import FadeIn from "../ui/FadeIn";

export default function Viewer({ image }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!image || !mountRef.current) return;
    return renderHologram(image, mountRef.current);
  }, [image]);

  return (
    <div style={{ height: "100vh", position: "relative", background: "black" }}>
      
      {/* HOLOGRAM STAGE */}
      <div
        ref={mountRef}
        style={{
          height: "100%",
          width: "100%",
        }}
      />

      {/* CONTROLS */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 32,
          color: "var(--muted)",
          fontSize: 13,
          pointerEvents: "none" // keeps UI calm
        }}
      >
        <FadeIn delay={600}>Glow</FadeIn>
        <FadeIn delay={800}>Depth</FadeIn>
        <FadeIn delay={1000}>Motion</FadeIn>
      </div>
    </div>
  );
}
