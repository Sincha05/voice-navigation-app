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
