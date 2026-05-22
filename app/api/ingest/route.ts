// app/api/ingest/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing authentication string." }, { status: 400 });
    }

    // 1. Fire concurrent requests to extract raw pipelines and stages from target environment
    const [pipelinesResponse, stagesResponse] = await Promise.all([
      fetch(`https://api.pipedrive.com/v1/pipelines?api_token=${token}`),
      fetch(`https://api.pipedrive.com/v1/stages?api_token=${token}`)
    ]);

    if (!pipelinesResponse.ok || !stagesResponse.ok) {
      return NextResponse.json({ success: false, error: "Handshake authentication rejected by target environment." }, { status: 401 });
    }

    const rawPipelines = await pipelinesResponse.json();
    const rawStages = await stagesResponse.json();

    if (!rawPipelines.success || !rawStages.success) {
      return NextResponse.json({ success: false, error: "Target data streams malformed or empty." }, { status: 500 });
    }

    // 2. Reverse-Engineer the relational structural mapping loops
    // Strip away corporate metadata noise and collapse them into structural entities
    const compiledPipelines = rawPipelines.data.map((rawPipe: any) => {
      // Find all flat database stages belonging to this specific parent pipeline ID
      const matchingStages = rawStages.data
        .filter((rawStage: any) => rawStage.pipeline_id === rawPipe.id && rawStage.active_flag)
        // Ensure they are correctly sorted relative to their exact operational placement layout
        .sort((a: any, b: any) => a.order_nr - b.order_nr)
        .map((rawStage: any) => ({
          id: `stg_${rawStage.id}`,
          name: rawStage.name,
          rottenDays: rawStage.rotten_flag ? rawStage.rotten_days : null
        }));

      return {
        id: `pip_${rawPipe.id}`,
        name: rawPipe.name,
        stages: matchingStages
      };
    });

    // 3. Assemble and serialize the fresh clean Blueprint Image Manifest output block
    const reverseEngineeredBlueprint = {
      id: `ingested_${Date.now()}`,
      name: "Discovered Target Environment Architecture",
      version: "1.0.0",
      pipelines: compiledPipelines,
      customFields: [] // We will link custom fields hook extractions next
    };

    return NextResponse.json({ success: true, blueprint: reverseEngineeredBlueprint });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}