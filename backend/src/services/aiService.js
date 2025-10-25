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
