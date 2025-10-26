import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return alert("Please fill all fields");

    // Simulate login success
    onLogin(email);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to right, #0f2027, #203a43, #2c5364)",
        color: "#fff",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.8)",
          padding: "40px",
          borderRadius: "15px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.6)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "30px", fontSize: "2rem" }}>
          🔐 Login
        </h1>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email" style={{ display: "block", marginBottom: "8px" }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "20px",
              borderRadius: "10px",
              border: "none",
              fontSize: "1rem",
            }}
            aria-label="Email"
            required
          />

          <label htmlFor="password" style={{ display: "block", marginBottom: "8px" }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "30px",
              borderRadius: "10px",
              border: "none",
              fontSize: "1rem",
            }}
            aria-label="Password"
            required
          />

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "15px",
              backgroundColor: "#1e90ff",
              color: "#fff",
              fontSize: "1.2rem",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
            }}
            aria-label="Login"
          >
            🔑 Login
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "0.9rem" }}>
          Don't have an account?{" "}
          <span
            style={{ color: "#32cd32", cursor: "pointer" }}
            onClick={() => alert("Redirect to Register")}
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
}
