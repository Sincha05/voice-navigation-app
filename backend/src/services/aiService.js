<<<<<<< HEAD
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const AI_BASE_URL = "http://localhost:8000"; // FastAPI server

// Text-to-Speech
export async function textToSpeech(text) {
  const response = await axios.post(`${AI_BASE_URL}/tts/`, { text });
  return response.data; // { status, file }
}

// Speech-to-Text
export async function speechToText(filePath) {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));

  const response = await axios.post(`${AI_BASE_URL}/stt/`, formData, {
    headers: formData.getHeaders(),
  });
  return response.data; // { status, text }
}

// Object Detection
export async function detectObjects(filePath) {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));

  const response = await axios.post(`${AI_BASE_URL}/detect/`, formData, {
    headers: formData.getHeaders(),
  });
  return response.data; // { status, detections }
}
=======
// aiService.js
import Tesseract from "tesseract.js";
import fs from "fs";

// OCR function
export const ocrImage = async (filePath) => {
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, "eng");
    
    // Optional: delete the uploaded file after processing
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting file:", err);
    });

    return { text };
  } catch (error) {
    console.error("OCR Service Error:", error);
    throw error;
  }
};
>>>>>>> ae504f8779a7685a375449c8ce6f393a670f06b6
