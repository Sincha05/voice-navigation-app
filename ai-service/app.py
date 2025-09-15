from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from utils.text_to_speech import generate_tts_file
from utils.speech_to_text import convert_speech_to_text
from utils.object_detection import detect_objects
import uuid
import os
import shutil
import asyncio
from pydantic import BaseModel

class TTSRequest(BaseModel):
    text: str

app = FastAPI(title="AI Voice Navigation Service", version="1.0")

# 🏠 Root endpoint
@app.get("/")
def root():
    return {"message": "AI Voice Navigation Service is running 🚀"}

# 🎤 Text → Speech

@app.post("/tts/")
async def tts_endpoint(req: TTSRequest):  # make endpoint async
    audio_file = await generate_tts_file(req.text)  # await coroutine
    return {"status": "success", "file": audio_file}

# 🎧 Speech → Text
@app.post("/stt/")
async def stt_endpoint(audio: UploadFile = File(...)):  # Make this async too
    # Save uploaded file temporarily
    temp_file = f"temp_{uuid.uuid4().hex}_{audio.filename}"
    
    try:
        # Save the uploaded file
        with open(temp_file, "wb") as buffer:
            content = await audio.read()  # Use async read
            buffer.write(content)
        
        # Convert speech to text (run in thread pool since it's CPU-intensive)
        text = await asyncio.to_thread(convert_speech_to_text, temp_file)
        
        return {"status": "success", "text": text}
    
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file):
            os.remove(temp_file)

# 📷 Object Detection
@app.post("/detect/")
def detect_endpoint(image: UploadFile = File(...)):
    filename = f"image_{uuid.uuid4().hex}.jpg"
    with open(filename, "wb") as f:
        f.write(image.file.read())

    results, output_file = detect_objects(filename)
    return {"status": "success", "detections": results, "output_file": output_file}
