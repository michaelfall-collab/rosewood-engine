import { NextRequest, NextResponse } from 'next/server';

const PIPEDRIVE_API_BASE = 'https://api.pipedrive.com';

interface DeployRequestBody {
  token: string;
  template: any;
}

interface PipelineResponse {
  success: boolean;
  data?: {
    id: number;
  };
  error?: string;
}

interface StageResponse {
  success: boolean;
  data?: {
    id: number;
  };
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

    logs.push('→ BUILDING: Creating real pipelines inside Pipedrive...');

    // Loop through pipelines
    for (const pipeline of template.pipelines || []) {
      try {
        // POST pipeline to Pipedrive
        const pipelineResponse = await fetch(`${PIPEDRIVE_API_BASE}/v1/pipelines?api_token=${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: pipeline.name,
            order_nr: pipeline.order_nr || 0,
          }),
        });

        const pipelineData: PipelineResponse = await pipelineResponse.json();

        if (!pipelineData.success || !pipelineData.data?.id) {
          throw new Error(`Failed to create pipeline "${pipeline.name}": ${pipelineData.error || 'Unknown error'}`);
        }

        const pipelineId = pipelineData.data.id;
        logs.push(`• Success: Created pipeline "${pipeline.name}" (ID: ${pipelineId})`);
        const deployedStages = [];

        // Loop through stages for this pipeline
        for (const stage of pipeline.stages || []) {
          try {
            const stageResponse = await fetch(
              `${PIPEDRIVE_API_BASE}/v1/stages?api_token=${token}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
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
                `Failed to create stage "${stage.name}" for pipeline "${pipeline.name}": ${stageData.error || 'Unknown error'}`
              );
            }

            logs.push(`• Success: Injected stage "${stage.name}" into "${pipeline.name}"`);
            deployedStages.push({
              name: stage.name,
              id: stageData.data.id,
            });
          } catch (stageError) {
            logs.push(`✗ Error deploying stage "${stage.name}": ${stageError instanceof Error ? stageError.message : String(stageError)}`);
          }
        }

        deployedPipelines.push({
          name: pipeline.name,
          id: pipelineId,
          stages: deployedStages,
        });
      } catch (pipelineError) {
        logs.push(`✗ Error deploying pipeline "${pipeline.name}": ${pipelineError instanceof Error ? pipelineError.message : String(pipelineError)}`);
      }
    }

    logs.push('✓ Complete: Your real CRM setup is live!');

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
