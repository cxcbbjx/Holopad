import FadeIn from "../ui/FadeIn";
import GlowButton from "../ui/GlowButton";

export default function Upload({ onSelect }) {
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
            onChange={(e) => e.target.files[0] && onSelect(e.target.files[0])}
          />
          <GlowButton>
            Choose image
          </GlowButton>
        </label>
      </FadeIn>
    </div>
  );
}
