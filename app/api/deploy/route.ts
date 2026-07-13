import { NextResponse } from "next/server";
import { deployPipelines } from "@/lib/pipedrive";
import type { PushPipeline } from "@/lib/types";

// Runs server-side (Node runtime): keeps the API token off the client and avoids browser CORS.
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; pipelines?: PushPipeline[] };
    const { token, pipelines } = body;

    if (!token || !Array.isArray(pipelines) || pipelines.length === 0) {
      return NextResponse.json(
        { success: false, logs: ["Missing an API token or there are no deal pipelines to push."] },
        { status: 400 }
      );
    }

    const result = await deployPipelines(token, pipelines);
    return NextResponse.json(result, { status: result.success ? 200 : 207 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unexpected error";
    return NextResponse.json({ success: false, logs: [`Fatal: ${msg}`] }, { status: 500 });
  }
}
