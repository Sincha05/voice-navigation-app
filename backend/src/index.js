// index.js
const express = require("express");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const fs = require("fs");

const app = express();
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// Health check
app.get("/", (req, res) => {
  res.send("✅ Node backend is running!");
});

// Example: send text to FastAPI TTS
app.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Call FastAPI
    const response = await axios.post("http://127.0.0.1:8000/tts/", { text });

    res.json(response.data);
  } catch (err) {
    console.error("Error calling FastAPI:", err.message);
    res.status(500).json({ error: "Failed to connect to AI service" });
  }
});

// Example: send audio to FastAPI STT
// Example: send audio to FastAPI STT
app.post("/stt", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Audio file required" });
    }

    const formData = new FormData();
    // 👇 must match FastAPI param name
    formData.append("audio", fs.createReadStream(req.file.path));

    const response = await axios.post("http://127.0.0.1:8000/stt/", formData, {
      headers: formData.getHeaders(),
    });

    res.json(response.data);
  } catch (err) {
    console.error("Error calling FastAPI:", err.message);
    res.status(500).json({ error: "Failed to connect to AI service" });
  }
});

app.post("/detect", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file required" });
    }

    const formData = new FormData();
    formData.append("image", fs.createReadStream(req.file.path));

    // Call FastAPI detect endpoint
    const response = await axios.post("http://127.0.0.1:8000/detect/", formData, {
      headers: formData.getHeaders(),
    });

    res.json(response.data);
  } catch (err) {
    console.error("Error calling FastAPI:", err.message);
    res.status(500).json({ error: "Failed to connect to AI service" });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Node backend running at http://localhost:${PORT}`);
});
