from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uuid
import os
import asyncio
import threading

# Utils
from utils.text_to_speech import generate_tts_file
from utils.speech_to_text import convert_speech_to_text
from utils.live_detection import start_live_detection, stop_live_detection, running

# FastAPI app
app = FastAPI(title="AI Voice Navigation Service", version="1.0")

# ---------------------------
# Data Models
# ---------------------------
class TTSRequest(BaseModel):
    text: str

# ---------------------------
# Routes
# ---------------------------

@app.get("/")
def root():
    return {"message": "AI Voice Navigation Service is running 🚀"}

# 🎤 Text → Speech
@app.post("/tts/")
async def tts_endpoint(req: TTSRequest):
    try:
        filename = f"tts_{uuid.uuid4().hex}.mp3"
        await generate_tts_file(req.text, filename)
        return {"status": "success", "file": filename}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# 🎧 Speech → Text
@app.post("/stt/")
async def stt_endpoint(audio: UploadFile = File(...)):
    temp_file = f"temp_{uuid.uuid4().hex}_{audio.filename}"
    try:
        # Save uploaded file
        with open(temp_file, "wb") as buffer:
            content = await audio.read()
            buffer.write(content)

        # Convert speech to text (CPU-bound)
        text = await asyncio.to_thread(convert_speech_to_text, temp_file)
        return {"status": "success", "text": text}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

# 🔴 Live Detection Start
@app.get("/live/start/")
def live_detection_start():
    global running
    if running:
        return {"status": "already_running", "message": "Live detection is already running."}

    # Run live detection in a separate thread
    threading.Thread(target=start_live_detection, daemon=True).start()
    return {"status": "started", "message": "Live detection started."}

# 🔴 Live Detection Stop
@app.get("/live/stop/")
def live_detection_stop():
    if not running:
        return {"status": "not_running", "message": "Live detection is not running."}

    stop_live_detection()
    return {"status": "stopped", "message": "Stop signal sent to live detection."}
