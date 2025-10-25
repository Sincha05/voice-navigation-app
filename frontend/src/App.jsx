// App.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";

const backendURL = "http://127.0.0.1:8000";

// ---------- Home Page ----------
function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        background: "linear-gradient(to right, #141e30, #243b55)",
        color: "#fff",
        fontFamily: "'Segoe UI', sans-serif",
        padding: "20px",
      }}
    >
      <h1 style={{ fontSize: "3rem", marginBottom: "20px" }}>
        👁️ Dhristi – See the World Differently.
      </h1>
      <p style={{ fontSize: "1.2rem", maxWidth: "700px", marginBottom: "40px" }}>
        Welcome to <b>Dhristi</b>, an AI-powered voice navigation assistant
        designed to empower visually impaired individuals with speech-to-text,
        text-to-speech, and smart object detection.
      </p>
      <div style={{ display: "flex", gap: "20px" }}>
        <Link
          to="/login"
          style={{
            background: "#1e90ff",
            padding: "15px 30px",
            borderRadius: "10px",
            color: "#fff",
            textDecoration: "none",
            fontSize: "1.2rem",
          }}
        >
          🔑 Login
        </Link>
        <Link
          to="/register"
          style={{
            background: "#32cd32",
            padding: "15px 30px",
            borderRadius: "10px",
            color: "#fff",
            textDecoration: "none",
            fontSize: "1.2rem",
          }}
        >
          📝 Register
        </Link>
      </div>
    </div>
  );
}

// ---------- Your Main App ----------
function Dashboard({ user, setUser }) {
  const [ttsText, setTtsText] = useState("");
  const [ttsResult, setTtsResult] = useState(null);

  const [sttFile, setSttFile] = useState(null);
  const [sttResult, setSttResult] = useState(null);

  const [detectFile, setDetectFile] = useState(null);
  const [detectResult, setDetectResult] = useState(null);

    const [ocrFile, setOcrFile] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);

  useEffect(() => {
    if (ttsResult?.file) {
      const audio = new Audio(`${backendURL}/uploads/${ttsResult.file}`);
      audio.play();
    }
  }, [ttsResult]);

  const speakText = (text) => {
    if (!text) return;
    const speech = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(speech);
  };

  const handleTTS = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${backendURL}/tts/`, { text: ttsText });
      setTtsResult(res.data);
    } catch (err) {
      alert("TTS Error: " + err.message);
    }
  };

  const handleSTT = async (e) => {
    e.preventDefault();
    if (!sttFile) return alert("Upload audio file");
    const formData = new FormData();
    formData.append("audio", sttFile);
    try {
      const res = await axios.post(`${backendURL}/stt/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSttResult(res.data);
      if (res.data?.text) speakText(res.data.text);
    } catch (err) {
      alert("STT Error: " + err.message);
    }
  };

  const handleDetect = async (e) => {
    e.preventDefault();
    if (!detectFile) return alert("Upload image");
    const formData = new FormData();
    formData.append("image", detectFile);
    try {
      const res = await axios.post(`${backendURL}/detect/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDetectResult(res.data);
      if (res.data.detections?.length > 0) {
        const names = res.data.detections.map((d) => d.class_name).join(", ");
        speakText("Detected objects: " + names);
      } else speakText("No objects detected");
    } catch (err) {
      alert("Detection Error: " + err.message);
    }
  };

  const handleOCR = async (e) => {
    e.preventDefault();
    if (!ocrFile) return alert("Upload image");
    const formData = new FormData();
    formData.append("file", ocrFile); // must match backend param

    try {
      const res = await axios.post(`${backendURL}/ocr/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOcrResult(res.data);
      if (res.data.text) speakText(res.data.text);
    } catch (err) {
      alert("OCR Error: " + err.message);
    }
  };

  const cardStyle = {
    background: "linear-gradient(135deg, #1f1f1f, #2c2c2c)",
    padding: "20px",
    borderRadius: "15px",
    boxShadow: "0 8px 16px rgba(0,0,0,0.5)",
    marginBottom: "30px",
  };

  const buttonStyle = {
    padding: "15px 25px",
    fontSize: "1.1rem",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    color: "#fff",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background: "linear-gradient(to right, #0f2027, #203a43, #2c5364)",
        color: "#fff",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      <h1 style={{ textAlign: "center", fontSize: "2.5rem", marginBottom: "50px" }}>
        🎤 AI Voice Navigation
      </h1>
      <p style={{ textAlign: "center", marginBottom: "40px", fontSize: "1.2rem" }}>
        Welcome, <strong>{user.username}</strong>!{" "}
        <span
          style={{ color: "#ff4500", cursor: "pointer" }}
          onClick={() => setUser(null)}
        >
          Logout
        </span>
      </p>

      {/* TTS */}
      <div style={cardStyle}>
        <h2>Text → Speech</h2>
        <form onSubmit={handleTTS}>
          <textarea
            value={ttsText}
            onChange={(e) => setTtsText(e.target.value)}
            placeholder="Enter text here..."
            rows={3}
            style={{ width: "100%", padding: "12px", borderRadius: "10px" }}
          />
          <button type="submit" style={{ ...buttonStyle, background: "#1e90ff" }}>
            🔊 Speak
          </button>
        </form>
      </div>

      {/* STT */}
      <div style={cardStyle}>
        <h2>Speech → Text</h2>
        <form onSubmit={handleSTT}>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setSttFile(e.target.files[0])}
            style={{ marginBottom: "15px" }}
          />
          <br />
          <button type="submit" style={{ ...buttonStyle, background: "#32cd32" }}>
            📝 Transcribe
          </button>
        </form>
        {sttResult && <pre>{sttResult.text}</pre>}
      </div>

      {/* Detection */}
<div style={cardStyle}>
  <h2>Object Detection</h2>
  <form onSubmit={handleDetect}>
    <input
      type="file"
      accept="image/*"
      onChange={(e) => setDetectFile(e.target.files[0])}
      style={{ marginBottom: "15px" }}
    />
    <br />
    <button type="submit" style={{ ...buttonStyle, background: "#ff4500" }}>
      🔍 Detect Objects
    </button>
  </form>
  {detectResult?.output_file && (
    <div>
      <img
        src={`${backendURL}/uploads/${detectResult.output_file}`}
        alt="Detected"
        style={{ width: "100%", borderRadius: "10px" }}
      />
      <pre>{JSON.stringify(detectResult.detections, null, 2)}</pre>
    </div>
  )}
</div>

{/* OCR / Capture & Read */}
<div style={cardStyle}>
  <h2>Capture & Read (OCR)</h2>
  <form onSubmit={handleOCR}>
    <input
      type="file"
      accept="image/*"
      onChange={(e) => setOcrFile(e.target.files[0])}
      style={{ marginBottom: "15px" }}
    />
    <br />
    <button type="submit" style={{ ...buttonStyle, background: "#ff69b4" }}>
      📖 Read Text
    </button>
  </form>
  {ocrResult && (
    <div>
      <p><strong>Extracted Text:</strong></p>
      <pre>{ocrResult.text}</pre>
      {ocrResult.audio_file && (
        <audio controls src={`${backendURL}/uploads/${ocrResult.audio_file}`} />
      )}
    </div>
  )}
</div>
</div>
  )}
// ---------- Auth Pages ----------
function Login({ setUser }) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to right, #0f2027, #203a43, #2c5364)",
        color: "#fff",
      }}
    >
      <form
        style={{ padding: "30px", background: "#1f1f1f", borderRadius: "10px" }}
        onSubmit={(e) => {
          e.preventDefault();
          setUser({ username: e.target.email.value.split("@")[0], email: e.target.email.value });
          navigate("/dashboard");
        }}
      >
        <h1>🔑 Login</h1>
        <input type="email" name="email" placeholder="Email" required style={{ margin: "10px", padding: "10px" }} />
        <input type="password" name="password" placeholder="Password" required style={{ margin: "10px", padding: "10px" }} />
        <button type="submit" style={{ margin: "10px", padding: "10px", background: "#1e90ff", color: "#fff" }}>
          Login
        </button>
      </form>
    </div>
  );
}

function Register() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to right, #0f2027, #203a43, #2c5364)",
        color: "#fff",
      }}
    >
      <form
        style={{ padding: "30px", background: "#1f1f1f", borderRadius: "10px" }}
        onSubmit={(e) => {
          e.preventDefault();
          alert("Registered successfully! Please login.");
          navigate("/login");
        }}
      >
        <h1>📝 Register</h1>
        <input type="text" name="username" placeholder="Username" required style={{ margin: "10px", padding: "10px" }} />
        <input type="email" name="email" placeholder="Email" required style={{ margin: "10px", padding: "10px" }} />
        <input type="password" name="password" placeholder="Password" required style={{ margin: "10px", padding: "10px" }} />
        <button type="submit" style={{ margin: "10px", padding: "10px", background: "#32cd32", color: "#fff" }}>
          Register
        </button>
      </form>
    </div>
  );
}

// ---------- Root App ----------
export default function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} setUser={setUser} /> : <Login setUser={setUser} />} />
      </Routes>
    </Router>
  );
}
