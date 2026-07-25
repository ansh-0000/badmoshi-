import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        response: { type: Type.STRING },
        suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["response", "suggestedActions"]
    };

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: 'Where is the best place to eat in Delhi?',
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });
        console.log("SUCCESS:");
        console.log(result.text);
    } catch (err) {
        console.error("ERROR:", err);
    }
}

run();
