import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Dynamically extract the model ID from the environment with a robust fallback target
const TARGET_MODEL = process.env.GEMINI_MODEL_ID || 'gemini-3.1-flash-lite';

export async function POST(request: Request) {
  try {
    const { systemPrompt, userPrompt } = await request.json();

    if (!systemPrompt || !userPrompt) {
      return NextResponse.json({ success: false, error: "Missing prompt payloads" }, { status: 400 });
    }

    // Execution uses the decoupled configuration parameter
    const response = await ai.models.generateContent({
      model: TARGET_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
      }
    });

    const textOutput = response.text || "Failed to compile automation instructions.";

    return NextResponse.json({ 
      success: true, 
      markdownBlock: textOutput,
      compiledBy: TARGET_MODEL // Telemetry tracking parameter
    });
  } catch (error: any) {
    console.error(`Gemini Engine Execution Failure [${TARGET_MODEL}]:`, error);
    return NextResponse.json({ success: false, error: error.message || "Unknown server error" }, { status: 500 });
  }
}