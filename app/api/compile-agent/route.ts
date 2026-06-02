import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Dynamically extract the model ID from the environment with a robust fallback target
const TARGET_MODEL = process.env.GEMINI_MODEL_ID || 'gemini-3.1-flash-lite';

const automationBlockSchema = {
  type: "OBJECT",
  properties: {
    automationNumber: { type: "STRING" },
    stageName: { type: "STRING" },
    operationalGoal: { type: "STRING" },
    impactedRoles: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    setupSteps: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    governanceNotes: { type: "STRING" }
  },
  required: ["automationNumber", "stageName", "operationalGoal", "impactedRoles", "setupSteps", "governanceNotes"]
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { systemPrompt, userPrompt, schema, mode, stages } = body;

    // Handle high-efficiency batch telemetry ingestion mode
    if (mode === 'telemetry-batch' && Array.isArray(stages)) {
      const batchResponse = await ai.models.generateContent({
        model: TARGET_MODEL,
        contents: `Analyze this chronological sequence of CRM pipeline stages: ${JSON.stringify(stages)}.
Generate realistic operational telemetry parameters for each stage based on its position in the pipeline flow.
Return a single valid JSON array containing exactly ${stages.length} objects matching this interface model:
[{ "targetDirective": "Brief sentence detailing real human intent and success criteria", "stuckThreshold": "X Days" }]
Do not wrap the output in markdown code blocks or return conversational prose.`,
        config: {
          systemInstruction: "You are a senior CRM operations strategist. Provide precise, actionable business logic coordinates for pipeline stages.",
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                targetDirective: { type: "STRING" },
                stuckThreshold: { type: "STRING" }
              },
              required: ["targetDirective", "stuckThreshold"]
            }
          } as any
        }
      });

      const batchText = batchResponse.text || "[]";
      return NextResponse.json({
        success: true,
        jsonObject: { stages: JSON.parse(batchText) },
        compiledBy: TARGET_MODEL
      });
    }

    if (!systemPrompt || !userPrompt) {
      return NextResponse.json({ success: false, error: "Missing prompt payloads" }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: TARGET_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1, // Dropping to 0.1 maximizes deterministic schema adherence
        
        // CHANGE THESE TWO LINES BELOW TO camelCase:
        responseMimeType: "application/json", // Forces JSON output
        responseSchema: (schema || automationBlockSchema) as any // Enforces the blueprint structure
      }
    });

    const textOutput = response.text || "{}";

    return NextResponse.json({ 
      success: true, 
      jsonObject: JSON.parse(textOutput),
      compiledBy: TARGET_MODEL // Telemetry tracking parameter
    });
  } catch (error: any) {
    console.error(`Gemini Engine Execution Failure [${TARGET_MODEL}]:`, error);
    return NextResponse.json({ success: false, error: error.message || "Unknown server error" }, { status: 500 });
  }
}