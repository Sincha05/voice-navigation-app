import React, { useState, useEffect, useRef } from "react";

const backendURL = "";

function App() {
  const [ocrResult, setOcrResult] = useState("");
  const [objectResult, setObjectResult] = useState([]);
  const [sttResult, setSttResult] = useState("");
  const [ttsText, setTtsText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveDetecting, setIsLiveDetecting] = useState(false);
  const [liveDetections, setLiveDetections] = useState([]);
  const [cameraError, setCameraError] = useState("");
  const [activeTab, setActiveTab] = useState("home");

  const recognitionRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const isProcessingFrameRef = useRef(false);

  const speakText = (text) => {
    if (!text) return;
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    window.speechSynthesis.speak(speech);
  };

  const handleOCR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${backendURL}/ocr/`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setOcrResult(data.text);
      speakText("Text read successfully. " + data.text);
    } catch (err) {
      console.error(err);
      speakText("Error reading text from image.");
    }
  };

  const handleObjectDetection = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(`${backendURL}/detect/`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setObjectResult(data.detections);
      if (data.detections?.length > 0) {
        const names = data.detections.map((d) => d.class_name).join(", ");
        speakText("Objects detected: " + names);
      } else {
        speakText("No objects detected.");
      }
    } catch (err) {
      console.error(err);
      speakText("Error detecting objects.");
    }
  };

  const handleStartRecording = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      setSttResult(transcript);
    };

    recognition.onend = () => {
      if (isRecording) recognition.start();
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    speakText("Recording started. Speak now.");
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      speakText("Recording stopped.");
    }
  };

  const handleTTS = () => {
    if (!ttsText.trim()) return;
    speakText(ttsText);
  };

  const captureAndSendFrame = async () => {
    if (isProcessingFrameRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2) return; // Wait until HAVE_CURRENT_DATA

    isProcessingFrameRef.current = true;
    try {
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          isProcessingFrameRef.current = false;
          return;
        }
        const formData = new FormData();
        formData.append("file", blob, "frame.jpg");

        try {
          const res = await fetch(`${backendURL}/live/frame/`, {
            method: "POST",
            body: formData
          });
          const data = await res.json();
          if (data.detections) {
            setLiveDetections(data.detections);
            if (data.detections.length > 0) {
              const names = data.detections.map(d =>
                d.distance ? `${d.class_name} ${d.distance}m ${d.direction}` : `${d.class_name} ${d.direction}`
              ).join(", ");
              speakText("Detected: " + names);
            }
          }
        } catch (err) {
          console.error("Frame detection request error:", err);
        } finally {
          isProcessingFrameRef.current = false;
        }
      }, "image/jpeg", 0.7);
    } catch (err) {
      console.error("Frame capture error:", err);
      isProcessingFrameRef.current = false;
    }
  };

  const startLiveDetection = async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsLiveDetecting(true);
      speakText("Live camera detection started.");

      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(captureAndSendFrame, 2000);
    } catch (err) {
      console.error("Camera access failed:", err);
      const errMsg = "Camera permission required for live detection.";
      setCameraError(errMsg);
      speakText(errMsg);
    }
  };

  const stopLiveDetection = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isProcessingFrameRef.current = false;
    setIsLiveDetecting(false);
    setLiveDetections([]);
    speakText("Live detection stopped.");
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const renderHome = () => (
    <div className="home-container">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .home-container {
          text-align: center;
          padding: 80px 20px;
          animation: fadeInUp 0.8s ease-out;
        }
        
        .hero-icon {
          font-size: 120px;
          animation: float 3s ease-in-out infinite;
          display: inline-block;
          margin-bottom: 30px;
        }
        
        .hero-title {
          font-size: 4rem;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 20px;
          animation: fadeInUp 0.8s ease-out 0.2s both;
        }
        
        .hero-subtitle {
          font-size: 1.3rem;
          color: rgba(255, 255, 255, 0.8);
          max-width: 700px;
          margin: 0 auto 50px;
          line-height: 1.8;
          animation: fadeInUp 0.8s ease-out 0.4s both;
        }
        
        .cta-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 18px 45px;
          border-radius: 50px;
          color: white;
          border: none;
          font-size: 1.3rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
          animation: fadeInUp 0.8s ease-out 0.6s both;
        }
        
        .cta-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.6);
        }
        
        .cta-button:active {
          transform: translateY(-1px);
        }
      `}</style>
      
      <div className="hero-icon">👁️</div>
      <h1 className="hero-title">Dhristi</h1>
      <p className="hero-subtitle">
        See the World Differently. An AI-powered voice navigation assistant
        designed to empower visually impaired individuals with speech-to-text,
        text-to-speech, and smart object detection.
      </p>
      <button className="cta-button" onClick={() => setActiveTab("dashboard")}>
        Get Started →
      </button>
    </div>
  );

  const renderDashboard = () => (
    <div className="dashboard">
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .dashboard {
          animation: fadeInUp 0.6s ease-out;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .dashboard-header {
          text-align: center;
          margin-bottom: 50px;
          animation: slideIn 0.6s ease-out;
        }
        
        .dashboard-title {
          font-size: 3rem;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 10px;
        }
        
        .feature-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 30px;
          margin-bottom: 30px;
          transition: all 0.3s ease;
          animation: scaleIn 0.6s ease-out;
        }
        
        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        .card-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .card-icon {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
          font-size: 28px;
        }
        
        .card-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
        }
        
        .primary-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 28px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 5px;
        }
        
        .primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }
        
        .danger-btn {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        .success-btn {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        
        .file-input-wrapper {
          position: relative;
          display: inline-block;
          margin: 10px 0;
        }
        
        .file-input-wrapper input[type="file"] {
          position: absolute;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
        
        .file-input-label {
          background: rgba(255, 255, 255, 0.1);
          border: 2px dashed rgba(255, 255, 255, 0.3);
          padding: 20px 30px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .file-input-label:hover {
          border-color: rgba(102, 126, 234, 0.6);
          background: rgba(102, 126, 234, 0.1);
        }
        
        .result-box {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          border-radius: 12px;
          margin-top: 20px;
          animation: scaleIn 0.4s ease-out;
        }
        
        .result-title {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 10px;
          font-size: 1.1rem;
        }
        
        .result-content {
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
        }
        
        .detection-list {
          list-style: none;
          padding: 0;
        }
        
        .detection-item {
          background: rgba(255, 255, 255, 0.05);
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 8px;
          border-left: 3px solid #667eea;
          animation: slideIn 0.3s ease-out;
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .status-active {
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
        }
        
        .status-inactive {
          background: rgba(244, 67, 54, 0.2);
          color: #f44336;
        }
        
        .textarea-custom {
          width: 100%;
          min-height: 100px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 15px;
          color: white;
          font-size: 1rem;
          font-family: inherit;
          resize: vertical;
          transition: all 0.3s ease;
        }
        
        .textarea-custom:focus {
          outline: none;
          border-color: rgba(102, 126, 234, 0.6);
          background: rgba(255, 255, 255, 0.08);
        }
        
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }
        
        .recording-indicator {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(244, 67, 54, 0.2);
          border-radius: 20px;
          color: #f44336;
          font-weight: 600;
          margin: 10px 0;
        }
      `}</style>

      <div className="dashboard-header">
        <h1 className="dashboard-title">Voice Navigation Dashboard</h1>
      </div>

      {/* OCR Card */}
      <div className="feature-card" style={{ animationDelay: '0.1s' }}>
        <div className="card-header">
          <div className="card-icon">📖</div>
          <h2 className="card-title">Read Text from Image</h2>
        </div>
        
        <div className="file-input-wrapper">
          <input type="file" accept="image/*" onChange={handleOCR} id="ocr-input" />
          <label htmlFor="ocr-input" className="file-input-label">
            📤 Choose an image to extract text
          </label>
        </div>
        
        {ocrResult && (
          <div className="result-box">
            <div className="result-title">Extracted Text:</div>
            <div className="result-content">{ocrResult}</div>
          </div>
        )}
      </div>

      {/* Object Detection Card */}
      <div className="feature-card" style={{ animationDelay: '0.2s' }}>
        <div className="card-header">
          <div className="card-icon">👁️</div>
          <h2 className="card-title">Object Detection</h2>
        </div>
        
        <div className="file-input-wrapper">
          <input type="file" accept="image/*" onChange={handleObjectDetection} id="object-input" />
          <label htmlFor="object-input" className="file-input-label">
            📤 Choose an image to detect objects
          </label>
        </div>
        
        {objectResult.length > 0 && (
          <div className="result-box">
            <div className="result-title">Detected Objects:</div>
            <ul className="detection-list">
              {objectResult.map((obj, i) => (
                <li key={i} className="detection-item">
                  <strong>{obj.class_name}</strong> - {(obj.confidence * 100).toFixed(1)}% confidence
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Speech to Text Card */}
      <div className="feature-card" style={{ animationDelay: '0.3s' }}>
        <div className="card-header">
          <div className="card-icon">🎤</div>
          <h2 className="card-title">Speech to Text</h2>
        </div>
        
        {isRecording && (
          <div className="recording-indicator">
            <div className="pulse-dot" style={{ background: '#f44336' }}></div>
            Recording in progress...
          </div>
        )}
        
        {!isRecording ? (
          <button onClick={handleStartRecording} className="primary-btn">
            🎙️ Start Recording
          </button>
        ) : (
          <button onClick={handleStopRecording} className="primary-btn danger-btn">
            ⏹️ Stop Recording
          </button>
        )}
        
        {sttResult && (
          <div className="result-box">
            <div className="result-title">Transcribed Text:</div>
            <div className="result-content">{sttResult}</div>
          </div>
        )}
      </div>

      {/* Text to Speech Card */}
      <div className="feature-card" style={{ animationDelay: '0.4s' }}>
        <div className="card-header">
          <div className="card-icon">🔊</div>
          <h2 className="card-title">Text to Speech</h2>
        </div>
        
        <textarea
          className="textarea-custom"
          placeholder="Type something to speak..."
          value={ttsText}
          onChange={(e) => setTtsText(e.target.value)}
        />
        
        <button onClick={handleTTS} className="primary-btn" style={{ marginTop: '10px' }}>
          🔉 Speak This Text
        </button>
      </div>

      {/* Live Detection Card */}
      <div className="feature-card" style={{ animationDelay: '0.5s' }}>
        <div className="card-header">
          <div className="card-icon">📸</div>
          <h2 className="card-title">Live Object Detection</h2>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <span className={isLiveDetecting ? "status-badge status-active" : "status-badge status-inactive"}>
            <div className="pulse-dot" style={{ background: isLiveDetecting ? '#4caf50' : '#f44336' }}></div>
            {isLiveDetecting ? 'Running' : 'Stopped'}
          </span>
        </div>
        
        {cameraError && (
          <div className="result-box" style={{ borderColor: '#f44336', color: '#f44336', marginBottom: '15px' }}>
            ⚠️ {cameraError}
          </div>
        )}

        <div style={{ margin: '15px 0', display: isLiveDetecting ? 'block' : 'none' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', maxHeight: '400px', borderRadius: '12px', background: '#000' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        
        {!isLiveDetecting ? (
          <button onClick={startLiveDetection} className="primary-btn success-btn">
            ▶️ Start Live Detection
          </button>
        ) : (
          <button onClick={stopLiveDetection} className="primary-btn danger-btn">
            ⏹️ Stop Live Detection
          </button>
        )}
        
        {liveDetections.length > 0 && (
          <div className="result-box">
            <div className="result-title">Current Detections:</div>
            <ul className="detection-list">
              {liveDetections.map((obj, i) => (
                <li key={i} className="detection-item">
                  <strong>{obj.class_name}</strong>
                  {obj.distance && ` - ${obj.distance}m away`}
                  {obj.direction && ` - ${obj.direction}`}
                  {obj.confidence && ` (${(obj.confidence * 100).toFixed(1)}%)`}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {isLiveDetecting && liveDetections.length === 0 && (
          <div className="result-box">
            <div className="result-content" style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
              No objects detected. Camera is monitoring...
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: #0f0f1e;
          color: white;
          overflow-x: hidden;
        }
        
        .app-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%);
          padding: 20px;
          position: relative;
        }
        
        .app-container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.1) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }
        
        .app-content {
          position: relative;
          z-index: 1;
        }
        
        .nav-bar {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-bottom: 40px;
          animation: fadeInUp 0.6s ease-out;
        }
        
        .nav-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px 30px;
          border-radius: 50px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        
        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }
        
        .nav-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }
      `}</style>
      
      <div className="app-container">
        <div className="app-content">
          <nav className="nav-bar">
            <button 
              className={`nav-btn ${activeTab === "home" ? "active" : ""}`}
              onClick={() => setActiveTab("home")}
            >
              Home
            </button>
            <button 
              className={`nav-btn ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              Dashboard
            </button>
          </nav>

          {activeTab === "home" ? renderHome() : renderDashboard()}
        </div>
      </div>
    </>
  );
}

export default App;