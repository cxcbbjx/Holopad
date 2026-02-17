import { useState, useRef, useEffect } from "react";
import Logo from "../ui/Logo";

export default function Landing({ phase, onStart }) {
  // Helpers to check phase progress
  const isLogoVisible = phase !== "init";
  const isTextVisible = ["text_emerge", "tagline", "interaction"].includes(phase);
  const isTaglineVisible = ["tagline", "interaction"].includes(phase);
  const isButtonVisible = phase === "interaction";

  // Mouse tilt logic
  const logoRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Only enable tilt after interaction phase or when logo is fully visible
    if (!isLogoVisible) return;

    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX - innerWidth / 2) / innerWidth; // -0.5 to 0.5
      const y = (e.clientY - innerHeight / 2) / innerHeight; // -0.5 to 0.5
      
      // Limit tilt amount
      setTilt({ x: x * 20, y: y * 20 });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isLogoVisible]);

  return (
    <div style={styles.wrapper}>
      <style>{`
        @keyframes pulseGlow {
          0% { text-shadow: 0 0 10px rgba(100,180,255,0.7), 0 0 30px rgba(100,180,255,0.3); }
          50% { text-shadow: 0 0 24px rgba(100,180,255,1), 0 0 60px rgba(100,180,255,0.5); }
          100% { text-shadow: 0 0 10px rgba(100,180,255,0.7), 0 0 30px rgba(100,180,255,0.3); }
        }
      `}</style>

      {/* LOGO - "Draws by itself" using clip-path wipe */}
      <div
        ref={logoRef}
        style={{
          ...styles.logoWrapper,
          ...(isLogoVisible ? styles.logoScanning : styles.logoHidden),
          // If we move past scanning to text emerge, we keep it visible but maybe move it up slightly
          ...(isTextVisible && styles.logoFinished),
          
          // Apply dynamic tilt
          transform: isTextVisible
            ? `perspective(1000px) rotateY(${tilt.x}deg) rotateX(${-tilt.y}deg) translateY(-20px)`
            : styles.logoScanning.transform || styles.logoHidden.transform,
        }}
      >
        <Logo size={220} />
      </div>

      {/* BRAND NAME - "Coming from the screen" (Scale + Blur fade in) */}
      <div
        style={{
          ...styles.brandContainer,
          opacity: isTextVisible ? 1 : 0,
          transform: isTextVisible 
            ? "scale(1) translateZ(0)" 
            : "scale(2.5) translateZ(100px)", // Coming from "close" to screen
          filter: isTextVisible ? "blur(0px)" : "blur(20px)",
        }}
      >
        <div style={styles.name}>HOLO✦PAD</div>
      </div>

      {/* TAGLINE - Fades in after name */}
      <div
        style={{
          ...styles.taglineContainer,
          opacity: isTaglineVisible ? 1 : 0,
          transform: isTaglineVisible ? "translateY(0)" : "translateY(10px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
        }}
      >
        <div style={styles.tagline}>Turn images into light.</div>
        <div style={styles.description}>
          The key shift here is interface design. Interaction moves away from flat screens and into physical space, where depth, motion, and intent are captured directly.
        </div>
      </div>

      {/* CTA - Appears 2s later */}
      <button
        style={{
          ...styles.cta,
          opacity: isButtonVisible ? 1 : 0,
          transform: isButtonVisible ? "translateY(0)" : "translateY(10px)",
          pointerEvents: isButtonVisible ? "auto" : "none",
        }}
        onClick={onStart}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.02)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
        }}
      >
        Get Started
      </button>

    </div>
  );
}

/* ===================== */
/* STYLES (AESTHETIC)    */
/* ===================== */

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "black",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    overflow: "hidden",
    perspective: "1000px", // Essential for 3D "coming from screen" effect
  },

  /* LOGO STYLES */
  logoWrapper: {
    marginBottom: 40,
    position: "relative",
    // We remove the static transition property here because we want instant updates for mouse movement
    // But we need smooth transitions for the intro animations.
    // We'll handle this dynamically in the component if needed, or rely on CSS for the initial states.
    willChange: "transform", 
    transition: "clip-path 3s ease-in-out, filter 3.5s ease, opacity 0.8s", // Removed transform from transition for instant mouse response
  },
  
  logoHidden: {
    opacity: 0,
    clipPath: "inset(0 100% 0 0)", // Fully masked (hidden)
    filter: "grayscale(100%) brightness(200%)", // Starts bright white/gray
    transform: "scale(0.9)", // Start slightly smaller
  },

  logoScanning: {
    opacity: 1,
    clipPath: "inset(0 0% 0 0)", // Reveal wipe from left to right (or top down)
    filter: "grayscale(0%) brightness(100%)",
    transform: "scale(1)",
  },

  logoFinished: {
    // This state is now handled by the inline style in render for tilt
  },

  /* BRAND NAME STYLES */
  brandContainer: {
    transition: "all 1.8s cubic-bezier(0.16, 1, 0.3, 1)", // Smooth ease-out
    marginBottom: 16,
    willChange: "transform, opacity, filter",
  },

  name: {
    fontSize: 42,
    fontWeight: 200,
    letterSpacing: "0.6em",
    color: "rgba(255,255,255,0.95)",
    textShadow: "0 0 10px rgba(100,180,255,0.8), 0 0 30px rgba(100,180,255,0.4)",
    fontFamily: "'Inter', sans-serif",
    marginLeft: "0.6em", 
    animation: "pulseGlow 2.6s ease-in-out infinite"
  },

  /* TAGLINE STYLES */
  taglineContainer: {
    transition: "all 1.2s ease",
  },

  tagline: {
    fontSize: 13,
    letterSpacing: "0.3em",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
  },

  description: {
    maxWidth: "500px",
    fontSize: 14,
    lineHeight: "1.6",
    color: "rgba(255,255,255,0.6)",
    fontWeight: 300,
    letterSpacing: "0.02em",
    padding: "0 20px",
    textShadow: "0 0 10px rgba(0,0,0,0.5)",
  },

  /* CTA STYLES */
  cta: {
    marginTop: 60,
    padding: "14px 36px",
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "2px",
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "opacity 1.5s ease, transform 1.5s ease, background 0.3s, border-color 0.3s",
    backdropFilter: "blur(4px)",
    outline: "none",
  },
};
