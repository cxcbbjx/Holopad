import React from 'react';
import { Link } from 'react-router-dom';

export default function ActiveTheoryPage() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", position: "relative" }}>
      <iframe
        src="/about%20us/active%20theory.net/index.html"
        style={{ width: "100%", height: "100%", border: "none" }}
        title="Active Theory Replica"
      />
      <Link to="/about" style={{
        position: "absolute",
        top: 20,
        left: 20,
        zIndex: 100,
        color: "white",
        background: "rgba(0,0,0,0.5)",
        padding: "10px 20px",
        borderRadius: "20px",
        textDecoration: "none",
        border: "1px solid rgba(255,255,255,0.2)",
        fontFamily: "var(--font-family-base)",
        backdropFilter: "blur(4px)"
      }}>
        Back
      </Link>
    </div>
  );
}
