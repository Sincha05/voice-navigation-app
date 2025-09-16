import express from "express";
import multer from "multer";
import { textToSpeech, speechToText, detectObjects } from "../services/aiService.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Text-to-Speech
router.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const result = await textToSpeech(text);
    res.json(result);
  } catch (error) {
    console.error("TTS Error:", error.message);
    res.status(500).json({ error: "Failed to convert text to speech" });
  }
});

// Speech-to-Text
router.post("/stt", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File is required" });

    const result = await speechToText(req.file.path);
    res.json(result);
  } catch (error) {
    console.error("STT Error:", error.message);
    res.status(500).json({ error: "Failed to convert speech to text" });
  }
});

// Object Detection
router.post("/detect", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File is required" });

    const result = await detectObjects(req.file.path);
    res.json(result);
  } catch (error) {
    console.error("Detection Error:", error.message);
    res.status(500).json({ error: "Failed to detect objects" });
  }
});

export default router;
