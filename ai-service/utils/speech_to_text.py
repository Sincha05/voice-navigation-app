import whisper
import librosa
import numpy as np

# Load model once at startup
model = None

def load_model():
    global model
    if model is None:
        print("Loading Whisper model...")
        model = whisper.load_model("base")
        print("Model loaded successfully")

def convert_speech_to_text(audio_file_path: str):
    # Ensure model is loaded
    if model is None:
        load_model()
    
    try:
        audio, sr = librosa.load(audio_file_path, sr=16000, mono=True)
        audio = audio.astype(np.float32)
        result = model.transcribe(audio)
        return result["text"]
    except Exception as e:
        print(f"Error processing audio file: {e}")
        return None