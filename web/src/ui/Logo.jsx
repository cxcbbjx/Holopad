import { useRef } from "react";
import logoSrc from "./logo.png";

export default function Logo({ size = 190 }) {
  const ref = useRef(null);

  function handleMove(e) {
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const midX = rect.width / 2;
    const midY = rect.height / 2;

    const rotateX = ((y - midY) / midY) * 6;
    const rotateY = ((x - midX) / midX) * -6;

    ref.current.style.transform = `
      perspective(800px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale(1.02)
    `;
  }

  function reset() {
    ref.current.style.transform = `
      perspective(800px)
      rotateX(0deg)
      rotateY(0deg)
      scale(1)
    `;
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{
        width: size,
        marginBottom: 24,
        transition: "transform 0.3s ease",
        filter: `
          drop-shadow(0 0 28px rgba(110,193,255,0.45))
          drop-shadow(0 0 70px rgba(110,193,255,0.25))
        `,
        animation: "holoPulse 4s ease-in-out infinite"
      }}
    >
      <img
        src={logoSrc}
        alt="HOLOPAD"
        draggable={false}
        style={{
          width: "100%",
          height: "auto",
          objectFit: "contain",
          mixBlendMode: "screen",
          userSelect: "none",
          pointerEvents: "none"
        }}
      />
    </div>
  );
}
