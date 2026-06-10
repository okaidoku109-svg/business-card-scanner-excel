import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with expanded limits for high-resolution images
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // Initialize Gemini client (Lazy initialization check during calls)
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please set it in Settings > Secrets.");
    }
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Business card photo analyzer endpoint
  app.post("/api/scan-card", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "名刺の画像（Base64形式）が必要です。" });
      }

      const clientMimeType = mimeType || "image/jpeg";
      // Pure base64 data without data:image/jpeg;base64 prefix
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const ai = getGeminiClient();

      // System instruction in Japanese for highest parsing quality of Japanese business cards
      const systemInstruction = 
        "You are an expert OCR and data extraction system specialized in Japanese and English business cards (名刺).\n" +
        "Extract information from the provided business card image with absolute accuracy. Don't omit anything.\n" +
        "Format name, company name, representative phone numbers, mobile number, emails, website, and title correctly.\n" +
        "For Hiragana / Furigana reading of the name (nameReading), extract it in Hiragana if present or inferred accurately. (e.g., 'すずき たろう' for '鈴木 太郎').\n" +
        "If a field cannot be found on the card, return an empty string for that field.\n" +
        "Clean up any phone number formatting to standard hyphens if possible (e.g. 03-XXXX-XXXX or 090-XXXX-XXXX).";

      const prompt = "Please analyze this business card, read it completely, and extract all contact and company details into JSON structures.";

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: clientMimeType,
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "氏名（例：鈴木 太郎）" },
              nameReading: { type: Type.STRING, description: "氏名のふりがな（例：すずき たろう）※推測できる場合、またはカードに記載されている場合" },
              company: { type: Type.STRING, description: "企業名・会社名（例：サンプル株式会社）" },
              title: { type: Type.STRING, description: "役職（例：代表取締役, 営業部部長）" },
              department: { type: Type.STRING, description: "部署・部門（例：開発第一部）" },
              address: { type: Type.STRING, description: "会社住所（例：東京都千代田区神田町1-2-3）" },
              phone: { type: Type.STRING, description: "電話番号、代表電話番号（例：03-1234-5678）" },
              mobile: { type: Type.STRING, description: "携帯電話番号（例：090-1234-5678）" },
              email: { type: Type.STRING, description: "メールアドレス（例：taro.suzuki@example.com）" },
              website: { type: Type.STRING, description: "ウェブサイトURL（例：https://example.com）" },
              notes: { type: Type.STRING, description: "その他検出した文言、FAX番号、キャッチコピー、ロゴなどの補足説明" },
            },
            required: ["name", "company", "title", "address", "phone", "mobile", "email", "website"],
          },
        },
      });

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error("Geminiから情報が読み取れませんでした。画像がボヤけていないか確認してください。");
      }

      const parsedData = JSON.parse(textOutput);
      return res.json(parsedData);

    } catch (error: any) {
      console.error("Card processing error:", error);
      const errorMessage = error.message || "名刺の解析中にエラーが発生しました。";
      return res.status(500).json({ error: errorMessage });
    }
  });

  // Handle Vite middleware configuration
  if (process.env.NODE_ENV !== "production") {
    // Import Vite dynamically to prevent loading in production server bundles
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Fullstack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server", err);
});
