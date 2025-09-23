# app.py
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uuid
import os
import asyncio
import tempfile

from utils.text_to_speech import generate_tts_file
from utils.speech_to_text import convert_speech_to_text
from utils.object_detection import detect_objects

# ---------------- Directories ----------------
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------------- FastAPI app ----------------
app = FastAPI(title="AI Voice Navigation Service", version="1.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploads folder
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ---------------- Models ----------------
class TTSRequest(BaseModel):
    text: str

# ---------------- Root ----------------
@app.get("/")
def root():
    return {"message": "AI Voice Navigation Service is running 🚀"}

# ---------------- TTS ----------------
@app.post("/tts/")
async def tts_endpoint(req: TTSRequest):
    """
    Convert text → speech using edge-tts
    """
    try:
        filename = await generate_tts_file(req.text)
        return {"status": "success", "file": filename, "fileUrl": f"/uploads/{filename}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ---------------- STT ----------------
@app.post("/stt/")
async def stt_endpoint(audio: UploadFile = File(...)):
    """
    Convert speech → text using Whisper
    """
    # Save uploaded file in a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp_path = tmp.name
        tmp.write(await audio.read())

    try:
        # Run Whisper transcription in a thread to avoid blocking
        text = await asyncio.to_thread(convert_speech_to_text, tmp_path)
        return {"status": "success", "text": text}
    except Exception as e:
        return {"status": "error", "text": f"Error processing audio: {str(e)}"}
    finally:
        # Delete temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

# ---------------- Object Detection ----------------
@app.post("/detect/")
async def detect_endpoint(image: UploadFile = File(...)):
    """
    Detect objects in image using YOLOv8
    """
    # Save uploaded image
    filename = os.path.join(UPLOAD_DIR, f"detect_{uuid.uuid4().hex}.jpg")
    with open(filename, "wb") as f:
        f.write(await image.read())

    try:
        results, output_file = detect_objects(filename)
        return {
            "status": "success",
            "detections": results,
            "output_file": os.path.basename(output_file),
            "fileUrl": f"/uploads/{os.path.basename(output_file)}"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
