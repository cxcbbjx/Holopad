export default function GlowButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        color: "var(--text)",
        fontSize: 16,
        letterSpacing: 0.6,
        cursor: "pointer",
        padding: "10px 24px",
        position: "relative"
      }}
    >
      <span>{children}</span>

      <div style={{
        position: "absolute",
        bottom: 0,
        left: "20%",
        right: "20%",
        height: 1,
        background: "linear-gradient(90deg, transparent, var(--holo), transparent)",
        boxShadow: "0 0 12px var(--holo)"
      }} />
    </button>
  );
}
