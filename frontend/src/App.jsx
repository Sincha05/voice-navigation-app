import React, { useState } from "react";
import axios from "axios";

export default function App() {
  const [ttsText, setTtsText] = useState("");
  const [ttsResult, setTtsResult] = useState(null);

  const [sttFile, setSttFile] = useState(null);
  const [sttResult, setSttResult] = useState(null);

  const [detectFile, setDetectFile] = useState(null);
  const [detectResult, setDetectResult] = useState(null);

  // ------------------ TTS ------------------
  const handleTTS = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/tts", {
        text: ttsText,
      });
      setTtsResult(response.data);
    } catch (err) {
      alert("Error calling TTS: " + err.message);
    }
  };

  // ------------------ STT ------------------
  const handleSTT = async (e) => {
    e.preventDefault();
    if (!sttFile) return alert("Please upload an audio file");

    const formData = new FormData();
    formData.append("audio", sttFile);

    try {
      const response = await axios.post("http://localhost:5000/stt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSttResult(response.data);
    } catch (err) {
      alert("Error calling STT: " + err.message);
    }
  };

  // ------------------ DETECT ------------------
  const handleDetect = async (e) => {
    e.preventDefault();
    if (!detectFile) return alert("Please upload an image");

    const formData = new FormData();
    formData.append("image", detectFile);

    try {
      const response = await axios.post("http://localhost:5000/detect", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDetectResult(response.data);
    } catch (err) {
      alert("Error calling Detect: " + err.message);
    }
  };

  return (
    <div style={{ maxWidth: "700px", margin: "auto", padding: "20px" }}>
      <h1>🎤 AI Service Frontend</h1>

      {/* ---------- TTS ---------- */}
      <section style={{ marginBottom: "30px" }}>
        <h2>Text → Speech</h2>
        <form onSubmit={handleTTS}>
          <textarea
            value={ttsText}
            onChange={(e) => setTtsText(e.target.value)}
            placeholder="Enter text here..."
            rows={3}
            style={{ width: "100%", marginBottom: "10px" }}
          />
          <button type="submit">Convert to Speech</button>
        </form>
        {ttsResult && (
          <div style={{ marginTop: "10px" }}>
            <pre>{JSON.stringify(ttsResult, null, 2)}</pre>
            {ttsResult.fileUrl && (
              <audio controls src={ttsResult.fileUrl}></audio>
            )}
          </div>
        )}
      </section>

      {/* ---------- STT ---------- */}
      <section style={{ marginBottom: "30px" }}>
        <h2>Speech → Text</h2>
        <form onSubmit={handleSTT}>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setSttFile(e.target.files[0])}
          />
          <button type="submit">Transcribe</button>
        </form>
        {sttResult && (
          <div style={{ marginTop: "10px" }}>
            <pre>{JSON.stringify(sttResult, null, 2)}</pre>
          </div>
        )}
      </section>

      {/* ---------- DETECT ---------- */}
      <section>
        <h2>Object Detection</h2>
        <form onSubmit={handleDetect}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setDetectFile(e.target.files[0])}
          />
          <button type="submit">Detect Objects</button>
        </form>
        {detectResult && (
          <div style={{ marginTop: "10px" }}>
            <pre>{JSON.stringify(detectResult, null, 2)}</pre>
            {detectResult.output_file && (
              <img
                src={`http://localhost:5000/uploads/${detectResult.output_file}`}
                alt="Detected"
                style={{ width: "100%", marginTop: "10px" }}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
