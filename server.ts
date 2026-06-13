import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase JSON body limits for base64 image transmission
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Lazy initializer for GoogleGenAI to prevent crashing at startup if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not defined.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY_IF_ABSENT",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. API: Image Analysis & Auto-Enhancement advisor
app.post("/api/enhance-advisor", async (req, res) => {
  const { imageBase64, mimeType, fileName } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "Image data is required in base64 format." });
  }

  try {
    const ai = getGeminiClient();
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      // Return a simulated high-quality AI analysis if the API key is not configured yet
      return res.json({
        success: true,
        isSimulated: true,
        analysis: "Note: Running in simulation mode (API Key not set). GS INHANCE intelligent auto-calibration suggests boosting Sharpness, removing chromatic digital noise, and balancing exposure. Ideal for standard portraits.",
        parameters: {
          brightness: 12,
          contrast: 15,
          saturation: 8,
          sharpness: 45,
          temperature: -5,
          exposure: 5,
          denoise: 30,
          dehaze: 20
        },
        detectedIssues: [
          "Muted dynamic range",
          "Low fine-detail sharpness",
          "Subtle chroma noise in dark regions"
        ],
        hindiTips: "Is photo ka color temperature thoda cool hai. AI ne exposure ko badha kar aur denoise apply kar ke photo ko saaf (HD) banane ki settings suggest ki hain."
      });
    }

    // Format for Gemini API
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: imageBase64
      }
    };
    
    const promptPart = {
      text: `You are the core AI engine of "GS INHANCE" (a premium photo cleaner, HD upscale & video editor). 
Analyze this uploaded photo named "${fileName || 'image.jpg'}" for quality issues like blurriness, dull colors, bad lighting, noise, haze, or background complexity.
Suggest exact optimization values and return your analysis. 

RESPOND STRICTLY IN JSON conforming to this schema:
{
  "analysis": "A concise technical overview of visual flaws and how we will correct them, written in a helpful Hinglish tone (Hindi written in English alphabets mixed with English words).",
  "detectedIssues": ["array of strings listing 2-4 issues found like 'Motion Blur', 'Low exposure', etc."],
  "hindiTips": "A brief encouraging message in Hindi (Devenagari script or clean Hinglish) explaining what was fixed.",
  "parameters": {
    "brightness": -100 to 100 suggestion (0 is neutral),
    "contrast": -100 to 100 suggestion (0 is neutral),
    "saturation": -100 to 100 suggestion (0 is neutral),
    "sharpness": 0 to 100 suggestion (0 is neutral),
    "temperature": -100 to 100 suggestion (0 is neutral, negative is cooler, positive is warmer),
    "exposure": -100 to 100 suggestion,
    "denoise": 0 to 100 suggestion,
    "dehaze": 0 to 100 suggestion
  }
}`
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, promptPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["analysis", "detectedIssues", "hindiTips", "parameters"],
          properties: {
            analysis: { type: Type.STRING },
            hindiTips: { type: Type.STRING },
            detectedIssues: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            parameters: {
              type: Type.OBJECT,
              required: ["brightness", "contrast", "saturation", "sharpness", "temperature", "exposure", "denoise", "dehaze"],
              properties: {
                brightness: { type: Type.INTEGER },
                contrast: { type: Type.INTEGER },
                saturation: { type: Type.INTEGER },
                sharpness: { type: Type.INTEGER },
                temperature: { type: Type.INTEGER },
                exposure: { type: Type.INTEGER },
                denoise: { type: Type.INTEGER },
                dehaze: { type: Type.INTEGER }
              }
            }
          }
        }
      }
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      isSimulated: false,
      ...parsedResponse
    });

  } catch (error: any) {
    console.error("Gemini Image Advisor Error:", error);
    res.status(500).json({
      error: "Failed to analyze image using Gemini.",
      details: error.message || error
    });
  }
});

// 2. API: Assistant Conversational Chat
app.post("/api/chat-expert", async (req, res) => {
  const { messages, userPrompt } = req.body;

  try {
    const ai = getGeminiClient();
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      // Safe simulation fallback
      return res.json({
        reply: "GS INHANCE Expert: Maine aapke prompt ko samjha. Is photo ko HD banane ke liye, Sharpening slider ko 60% tak badhayein, 'AI Auto Clean' trigger karein aur noise filter ko set karein tabhi badhiya output milega!"
      });
    }

    // Format chat history or plain instruction
    const prompt = `You are the premium GS INHANCE AI Consultant, an expert in computer vision, image restoration, smart editing, BG removal, and video formatting. Help the user achieve HD quality. Communicate warmly in Hinglish (mix of Hindi & English written in English script). Keep the response concise, practical and visual-design focused.
User question: "${userPrompt || 'How to clean low quality photos?'}"
Recent context: ${JSON.stringify(messages || [])}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return res.json({
      reply: response.text || "Main is vakt reply nahi kar paa raha hu. Please sliders se try karein!"
    });

  } catch (error: any) {
    console.error("Gemini Chat Expert Error:", error);
    res.status(500).json({
      error: "Chat error occurred.",
      details: error.message
    });
  }
});

// Initialize Vite server or static handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production build from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GS INHANCE Fullstack server running on http://localhost:${PORT}`);
  });
}

startServer();
