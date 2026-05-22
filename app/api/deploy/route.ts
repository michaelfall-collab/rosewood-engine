import { NextRequest, NextResponse } from 'next/server';

const PIPEDRIVE_API_BASE = 'https://api.pipedrive.com';

interface DeployRequestBody {
  token: string;
  template: any;
}

interface PipelineResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface StageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DeployRequestBody = await request.json();
    const { token, template } = body;

    if (!token || !template) {
      return NextResponse.json(
        { error: 'Missing required fields: token and template' },
        { status: 400 }
      );
    }

    const logs: string[] = [];
    const deployedPipelines: any[] = [];

    logs.push('→ CHECKING: Analyzing existing Pipedrive account...');

    // Fetch existing pipelines to check for duplicates
    const existingPipelinesRes = await fetch(`${PIPEDRIVE_API_BASE}/v1/pipelines?api_token=${token}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const existingPipelinesData = await existingPipelinesRes.json();
    const existingPipelines = existingPipelinesData.success ? (existingPipelinesData.data || []) : [];

    // Fetch existing stages
    const existingStagesRes = await fetch(`${PIPEDRIVE_API_BASE}/v1/stages?api_token=${token}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const existingStagesData = await existingStagesRes.json();
    const existingStages = existingStagesData.success ? (existingStagesData.data || []) : [];

    logs.push('→ BUILDING: Deploying pipelines with intelligence...');

    // Loop through template pipelines
    for (const pipeline of template.pipelines || []) {
      try {
        // Check if pipeline already exists by name
        let pipelineId: number | null = null;
        const existingPipeline = existingPipelines.find((p: any) => p.name === pipeline.name);
        
        if (existingPipeline) {
          pipelineId = existingPipeline.id;
          logs.push(`• Reusing: Pipeline "${pipeline.name}" already exists (ID: ${pipelineId})`);
        } else {
          // Create new pipeline
          const pipelineResponse = await fetch(`${PIPEDRIVE_API_BASE}/v1/pipelines?api_token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: pipeline.name,
              order_nr: pipeline.order_nr || 0,
            }),
          });

          const pipelineData: PipelineResponse = await pipelineResponse.json();
          if (!pipelineData.success || !pipelineData.data?.id) {
            throw new Error(`Failed to create pipeline "${pipeline.name}": ${pipelineData.error || 'Unknown error'}`);
          }
          pipelineId = pipelineData.data.id;
          logs.push(`• Created: Pipeline "${pipeline.name}" (ID: ${pipelineId})`);
        }

        const deployedStages = [];

        // Loop through stages for this pipeline
        for (const stage of pipeline.stages || []) {
          try {
            // Check if stage already exists in this pipeline by name
            const existingStage = existingStages.find(
              (s: any) => s.pipeline_id === pipelineId && s.name === stage.name
            );

            if (existingStage) {
              logs.push(`• Skipped: Stage "${stage.name}" already exists in this pipeline`);
              deployedStages.push({
                name: stage.name,
                id: existingStage.id,
              });
              continue;
            }

            // Create new stage
            const stageResponse = await fetch(
              `${PIPEDRIVE_API_BASE}/v1/stages?api_token=${token}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: stage.name,
                  pipeline_id: pipelineId,
                  order_nr: stage.order_nr || 0,
                  deal_probability: stage.deal_probability,
                  rotten_flag: stage.rotten_flag || false,
                  rotten_days: stage.rotten_days,
                }),
              }
            );

            const stageData: StageResponse = await stageResponse.json();
            if (!stageData.success || !stageData.data?.id) {
              throw new Error(
                `Failed to create stage "${stage.name}": ${stageData.error || 'Unknown error'}`
              );
            }
            logs.push(`• Injected: Stage "${stage.name}" into "${pipeline.name}"`);
            deployedStages.push({
              name: stage.name,
              id: stageData.data.id,
            });
          } catch (stageError) {
            logs.push(`✗ Error with stage "${stage.name}": ${stageError instanceof Error ? stageError.message : String(stageError)}`);
          }
        }

        deployedPipelines.push({
          name: pipeline.name,
          id: pipelineId,
          stages: deployedStages,
        });
      } catch (pipelineError) {
        logs.push(`✗ Error with pipeline "${pipeline.name}": ${pipelineError instanceof Error ? pipelineError.message : String(pipelineError)}`);
      }
    }

    logs.push('✓ Complete: Your CRM setup is live and synchronized!');

    return NextResponse.json(
      {
        success: true,
        logs,
        data: deployedPipelines,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Deploy error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
