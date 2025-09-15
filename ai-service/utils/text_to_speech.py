import edge_tts
import uuid

async def generate_tts_file(text: str, filename: str = None):
    """Convert text to speech using Microsoft Edge TTS and save as mp3."""
    if not filename:
        filename = f"tts_{uuid.uuid4().hex}.mp3"

    voice = "en-US-AriaNeural"  # You can change voices
    tts = edge_tts.Communicate(text, voice)
    await tts.save(filename)
    return filename
