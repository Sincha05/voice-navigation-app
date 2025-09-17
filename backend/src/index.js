// index.js
const express = require("express");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// Serve static files from "public" and "uploads"
app.use("/static", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const upload = multer({ dest: "uploads/" });

// Health check
app.get("/", (req, res) => {
  res.send("✅ Node backend is running!");
});

// ------------------ TTS ------------------
app.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Call FastAPI
    const response = await axios.post("http://127.0.0.1:8000/tts/", { text });

    // If FastAPI returns a file path, serve it
    if (response.data.filePath) {
      const fileUrl = `http://localhost:5000/${response.data.filePath}`;
      return res.json({ ...response.data, fileUrl });
    }

    res.json(response.data);
  } catch (err) {
    console.error("Error calling FastAPI:", err.message);
    res.status(500).json({ error: "Failed to connect to AI service" });
  }
});

// ------------------ STT ------------------
app.post("/stt", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Audio file required" });
    }

    const formData = new FormData();
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

// ------------------ DETECT ------------------
app.post("/detect", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file required" });
    }

    const formData = new FormData();
    formData.append("image", fs.createReadStream(req.file.path));

    const response = await axios.post("http://127.0.0.1:8000/detect/", formData, {
      headers: formData.getHeaders(),
    });

    res.json(response.data);
  } catch (err) {
    console.error("Error calling FastAPI:", err.message);
    res.status(500).json({ error: "Failed to connect to AI service" });
  }
});

// ------------------ DOWNLOAD FILES ------------------
// Example: http://localhost:5000/download/result.json
app.get("/download/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  res.download(filePath); // forces download
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Node backend running at http://localhost:${PORT}`);
});
