import React from "react";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div
      style={{
        fontFamily: "'Segoe UI', sans-serif",
        background: "linear-gradient(to right, #0f2027, #203a43, #2c5364)",
        color: "#fff",
        minHeight: "100vh",
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "20px 50px",
          background: "rgba(0,0,0,0.6)",
        }}
      >
        <h2 style={{ fontWeight: "bold", fontSize: "1.5rem" }}>👁️ Drishti</h2>
        <div>
          <Link to="/" style={{ margin: "0 15px", color: "#fff", textDecoration: "none" }}>Home</Link>
          <Link to="/about" style={{ margin: "0 15px", color: "#fff", textDecoration: "none" }}>About</Link>
          <Link to="/login" style={{ margin: "0 15px", color: "#fff", textDecoration: "none" }}>Login</Link>
          <Link to="/register" style={{ margin: "0 15px", color: "#fff", textDecoration: "none" }}>Register</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header
        style={{
          textAlign: "center",
          padding: "80px 20px",
        }}
      >
        <h1 style={{ fontSize: "3rem", marginBottom: "20px" }}>
          👁️ Drishti – See the World Differently.
        </h1>
        <p style={{ fontSize: "1.3rem", maxWidth: "700px", margin: "0 auto 40px" }}>
          Empowering the visually impaired with AI-powered voice navigation,
          speech-to-text, text-to-speech, and real-time object detection.
        </p>
        <div>
          <Link to="/login">
            <button
              style={{
                padding: "12px 25px",
                margin: "10px",
                borderRadius: "8px",
                background: "#1e90ff",
                border: "none",
                color: "#fff",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              Login
            </button>
          </Link>
          <Link to="/register">
            <button
              style={{
                padding: "12px 25px",
                margin: "10px",
                borderRadius: "8px",
                background: "#32cd32",
                border: "none",
                color: "#fff",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              Register
            </button>
          </Link>
        </div>
      </header>

      {/* About Section */}
      <section
        style={{
          padding: "50px 20px",
          background: "rgba(255,255,255,0.05)",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "2rem", marginBottom: "20px" }}>About Drishti</h2>
        <p style={{ fontSize: "1.1rem", maxWidth: "800px", margin: "0 auto" }}>
          Drishti is an AI-powered assistant designed to help visually impaired
          individuals navigate their world with confidence. With features like
          speech-to-text, text-to-speech, and object detection, Drishti enables
          accessibility, independence, and safety — truly allowing you to{" "}
          <strong>see the world differently</strong>.
        </p>
      </section>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          padding: "20px",
          background: "rgba(0,0,0,0.7)",
          marginTop: "40px",
        }}
      >
        <p>© {new Date().getFullYear()} Drishti. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
