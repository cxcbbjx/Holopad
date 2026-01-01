import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "../../the second page/style.css";
import archVideoSrc from "../../the second page/architecture.mp4";
import cityVideoSrc from "../../the second page/city.mp4";

export default function SecondPage() {
  const mountRef = useRef(null);
  const [futureActive, setFutureActive] = useState("bands");

  useEffect(() => {
    window.THREE = THREE;
    let cancelled = false;
    (async () => {
      try {
        await import("../../the second page/main.js");
      } catch (e) {
        console.error("Holostage script load failed", e);
      }
      if (cancelled) return;
    })();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { root: null, threshold: 0.2 }
    );
    document.querySelectorAll(".section").forEach((el) => observer.observe(el));
    return () => {
      try { window.holostageCleanup && window.holostageCleanup(); } catch {}
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return (
    <div className="holostage">
      <section className="section section-holostage">
        <canvas id="bg" />
        <div className="holo-grid"></div>
        <div className="hero-orbs"></div>
        <div className="scan-line"></div>
        <div className="ui">
          <div className="header">
            <span>HOLO✦PAD</span>
            <span className="status">Holostage · Simulation Mode</span>
          </div>
          <div className="center-label">
            <h1 className="holo-title">Holostage</h1>
            <p className="holo-sub">Spatial Interface Prototype v0.1</p>
            <p className="holo-note">UNDER-MAINTAINANCE</p>
          </div>
          
        </div>
      </section>

      <section
        className="section section-architecture"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          e.currentTarget.style.setProperty("--tiltX", x.toString());
          e.currentTarget.style.setProperty("--tiltY", (-y).toString());
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.setProperty("--tiltX", "0");
          e.currentTarget.style.setProperty("--tiltY", "0");
        }}
      >
        <h2>Animated Architecture Flow</h2>
        <div className="arch-lines"></div>
        <div className="arch-grid">
          <div className="arch-block"><span>01</span><h3>Interaction Layer</h3><p>Scroll and cursor inputs interpreted as spatial intent.</p></div>
          <div className="arch-block"><span>02</span><h3>State Controller</h3><p>Finite state machine controlling entity behavior.</p></div>
          <div className="arch-block"><span>03</span><h3>Render Engine</h3><p>Real-time lighting, depth and material simulation.</p></div>
          <div className="arch-block"><span>04</span><h3>Parametric Core</h3><p>Mathematical surfaces define spatial topology.</p></div>
        </div>
        <div className="arch-progress"></div>
        <div className="media-grid">
          <div className="media wide">
            <video
              src={archVideoSrc}
              muted
              loop
              playsInline
              autoPlay
              preload="none"
            />
          </div>
        </div>
      </section>

      <section className="section section-city">
        <div className="section-bg">
          <video
            src={cityVideoSrc}
            muted
            loop
            playsInline
            autoPlay
            preload="none"
          />
        </div>
        <h2>Your City Tour</h2>
        <div className="price">$200</div>
        <p>Guided holographic city tour with spatial highlights.</p>
        <div className="media-grid">
          <div className="media">
            <video
              src="https://samplelib.com/lib/preview/mp4/sample-5s.mp4"
              muted
              loop
              playsInline
              autoPlay
              preload="none"
            />
          </div>
          <div className="media">
            <img
              src="https://picsum.photos/seed/city1/1280/720"
              alt="City skyline"
              loading="lazy"
            />
          </div>
          <div className="media">
            <img
              src="https://picsum.photos/seed/city2/1280/720"
              alt="City streets"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className={`section section-future ${futureActive ? `future-active-${futureActive}` : ""}`}>
        <div className="section-bg">
          <video
            src="/the second page/future.gif"
            muted
            loop
            playsInline
            autoPlay
            preload="none"
          />
        </div>
        <div className="future-orbs"></div>
        <h2>Future Products</h2>
        <ul className="future-list">
          <li
            className={`badge ${futureActive === "bands" ? "active" : ""}`}
            onMouseEnter={() => setFutureActive("bands")}
            onMouseLeave={() => setFutureActive(null)}
            onTouchStart={() => setFutureActive("bands")}
          >
            Holobands
          </li>
          
        </ul>
        <div className="future-cta">
          <div className="price-badge">$279</div>
          

        </div>
        <div className="future-display">
          <div className="future-desc bands">
            Lightweight wrist wearable emitting modulated light fields for spatial cues.
          </div>
          <div className="future-3d bands">
            <canvas id="band3d"></canvas>
          </div>
          <div className="future-desc rings">
            Minimal ring accessory enabling quick gestures and haptic feedback.
          </div>
          <div className="future-image rings">
            <img
              src="https://picsum.photos/seed/holorings/960/540"
              alt="Holorings"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      
      </div>
    
  );
}
