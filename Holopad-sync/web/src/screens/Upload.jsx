import FadeIn from "../ui/FadeIn";
import GlowButton from "../ui/GlowButton";
import { useNavigate } from "react-router-dom";

export default function Upload() {
  const navigate = useNavigate();

  const handleSelect = (file) => {
    // Create a temporary URL for the file to pass to Viewer
    // or just pass the file object if we can handle it.
    // Ideally we'd use context or state management, but navigation state works for simple flows.
    navigate('/viewer', { state: { image: file } });
  };

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
