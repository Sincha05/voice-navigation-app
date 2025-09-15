from ultralytics import YOLO
import os

# Load YOLOv8 model once
model = YOLO("yolov8n.pt")  # Small & fast model

def detect_objects(image_path: str):
    results = model(image_path)
    detections = []
    for result in results:
        for box in result.boxes:
            cls = model.names[int(box.cls[0])]
            conf = float(box.conf[0])
            detections.append({"class": cls, "confidence": conf})

    output_file = f"detected_{os.path.basename(image_path)}"
    results[0].save(filename=output_file)
    return detections, output_file
