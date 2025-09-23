# utils/text_to_speech.py
import edge_tts
import asyncio
import uuid
import os

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def generate_tts_file(text: str):
    filename = f"tts_{uuid.uuid4().hex}.mp3"
    filepath = os.path.join(UPLOAD_DIR, filename)

    communicate = edge_tts.Communicate(text, "en-US-AriaNeural")
    await communicate.save(filepath)
    return filename
