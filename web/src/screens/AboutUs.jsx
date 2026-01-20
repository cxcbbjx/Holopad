import { useEffect } from "react";
import { Link } from "react-router-dom";
import LiquidChrome from "../components/LiquidChrome";
import GradientBlinds from "../components/GradientBlinds";
import Waves from "../components/Waves";
import "../styles/theme.css";

export default function AboutUs() {
  useEffect(() => {}, []);
  return (
    <div style={{ width: "100vw", background: "#000", position: "relative" }}>
      <section style={{ position: "relative", padding: "120px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <style>
          {`
            @font-face {
              font-family: "nbarchitekt";
              src: url("/about us/active theory.net/assets/Fonts/NBArchitektStd-Regular-export/NBArchitektStd-Regular.woff2") format("woff2");
              font-style: normal;
              font-weight: 400;
            }
            @font-face {
              font-family: "nbarchitekt";
              src: url("/about us/active theory.net/assets/Fonts/NBArchitektStd-Bold-export/NBArchitektStd-Bold.woff2") format("woff2");
              font-style: normal;
              font-weight: 700;
            }
            .abt-architekt { font-family: "nbarchitekt", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
          `}
        </style>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <GradientBlinds
            gradientColors={["#0ea5e9", "#9333ea"]}
            angle={0}
            noise={0.25}
            blindCount={10}
            blindMinWidth={56}
            spotlightRadius={0.55}
            spotlightSoftness={1}
            spotlightOpacity={1}
            mouseDampening={0.18}
            distortAmount={0}
            shineDirection="left"
            mixBlendMode="lighten"
          />
        </div>
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <h1 className="glow-text abt-architekt" style={{ fontSize: "3.4rem", marginBottom: "14px", letterSpacing: "0.02em" }}>ABOUT HOLOPAD</h1>
          <p className="subtitle" style={{ color: "var(--holo-blue)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Spatial Computing Prototype • Real-time Graphics • Interaction Design
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "36px", marginTop: "40px", alignItems: "start" }}>
          <div className="glass-panel tech-border" style={{ padding: "30px" }}>
            <span className="mono-label" style={{ color: "var(--holo-blue)" }}>OVERVIEW</span>
            <h2 className="abt-architekt" style={{ margin: "10px 0", letterSpacing: "0.01em" }}>Vision</h2>
            <p style={{ opacity: 0.85, lineHeight: "1.7" }}>
              Holopad is an early-stage spatial interface exploring mathematical models, real-time graphics, and human interaction.
              The key shift here is interface design. Interaction moves away from flat screens and into physical space, where depth, motion, and intent are captured directly.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginTop: "18px" }}>
              <div className="glass-panel info-panel tech-border">
                <h3 className="abt-architekt">Status</h3>
                <p style={{ fontSize: "0.95rem" }}>Prototype v0.1 — under active development</p>
              </div>
              <div className="glass-panel info-panel tech-border">
                <h3 className="abt-architekt">Author</h3>
                <p style={{ fontSize: "0.95rem" }}>Shivang — Founder, Holopad</p>
              </div>
            </div>
          </div>
          <div className="glass-panel tech-border" style={{ padding: "30px" }}>
            <span className="mono-label" style={{ color: "var(--holo-blue)" }}>INFLUENCE</span>
            <h2 className="abt-architekt" style={{ margin: "10px 0", letterSpacing: "0.01em" }}>Craft & Inspiration</h2>
            <p style={{ opacity: 0.85, lineHeight: "1.7" }}>
              We study premium interactive craft and high-fidelity motion systems. Research folders
              include Active Theory references and hydra thread experiments, informing our shader language,
              threading models, and presentation polish.
            </p>
            <div style={{ marginTop: "16px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(0,240,255,0.12)" }}>
              <iframe
                title="Active Theory Reference"
                src={"/about%20us/active%20theory.net/index.html"}
                style={{ width: "100%", height: "420px", background: "#000" }}
              />
            </div>
            <div style={{ textAlign: "right", marginTop: "12px" }}>
              <Link to="/about/active" className="glass-panel" style={{ padding: "10px 18px", display: "inline-block", borderColor: "var(--holo-blue)", color: "var(--holo-blue)" }}>
                Open Fullscreen
              </Link>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "36px", marginTop: "40px" }}>
          <div className="glass-panel tech-border" style={{ padding: "30px" }}>
            <span className="mono-label" style={{ color: "var(--holo-blue)" }}>TECH STACK</span>
            <h2 className="abt-architekt" style={{ margin: "10px 0", letterSpacing: "0.01em" }}>Frontend</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li style={{ marginBottom: "12px" }}>
                <span className="mono-label" style={{ color: "#61dafb" }}>React + Vite</span> • Modular UI and fast dev tooling
              </li>
              <li style={{ marginBottom: "12px" }}>
                <span className="mono-label" style={{ color: "#ffffff" }}>Three.js</span> • Real-time WebGL and custom shaders
              </li>
              <li>
                <span className="mono-label" style={{ color: "#bd00ff" }}>Postprocessing</span> • Bloom, chromatic aberration, noise
              </li>
            </ul>
          </div>
          <div className="glass-panel tech-border" style={{ padding: "30px" }}>
            <span className="mono-label" style={{ color: "var(--holo-blue)" }}>PIPELINE</span>
            <h2 className="abt-architekt" style={{ margin: "10px 0", letterSpacing: "0.01em" }}>Backend & Holograms</h2>
            <p style={{ opacity: 0.85, lineHeight: "1.7" }}>
              Uploads are transformed to GLB with contain-fit textures, emissive accents, and alpha blending.
              Static serving uses Express, while the viewer integrates model-viewer for quick inspection.
            </p>
          </div>
        </div>

        <div style={{ marginTop: "40px" }}>
          <LiquidChrome baseColor={[0.06, 0.12, 0.22]} amplitude={0.22} speed={0.18} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "36px", marginTop: "40px", alignItems: "start" }}>
          <div className="glass-panel tech-border" style={{ padding: "30px" }}>
            <span className="mono-label" style={{ color: "var(--holo-blue)" }}>ROADMAP</span>
            <h2 className="abt-architekt" style={{ margin: "10px 0", letterSpacing: "0.01em" }}>Toward Wearables</h2>
            <p style={{ opacity: 0.85, lineHeight: "1.7" }}>
              We are building the software foundation before the hardware arrives. The algorithms perfected
              in the browser will power AR glasses and holographic displays, with micro-gesture input and
              environment projection as core primitives.
            </p>
          </div>
          <div className="glass-panel tech-border" style={{ padding: "30px" }}>
            <span className="mono-label" style={{ color: "var(--holo-blue)" }}>GET STARTED</span>
            <h2 className="abt-architekt" style={{ margin: "10px 0", letterSpacing: "0.01em" }}>Explore Holostage</h2>
            <p style={{ opacity: 0.85, lineHeight: "1.7", marginBottom: "14px" }}>
              Generate your first hologram and preview it in the browser.
            </p>
            <Link to="/second" className="glass-panel" style={{ padding: "12px 24px", display: "inline-block", borderColor: "var(--holo-blue)", color: "var(--holo-blue)" }}>
              Open Holostage
            </Link>
          </div>
        </div>

        <div style={{ marginTop: "50px" }}>
          <Waves
            lineColor="#fff"
            backgroundColor="rgba(255, 255, 255, 0.12)"
            waveSpeedX={0.02}
            waveSpeedY={0.01}
            waveAmpX={40}
            waveAmpY={20}
            friction={0.9}
            tension={0.01}
            maxCursorMove={120}
            xGap={12}
            yGap={36}
            className="pointer-events-none"
            style={{ zIndex: 0 }}
          />
        </div>
      </section>
    </div>
  );
}
