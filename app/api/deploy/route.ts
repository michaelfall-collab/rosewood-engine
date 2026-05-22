import { NextRequest, NextResponse } from 'next/server';
import type { CRMArchitectureBlueprint, PipelineSpec, PipelineStageSpec } from '@/types/blueprint';

const PIPEDRIVE_API_BASE = 'https://api.pipedrive.com';

interface DeployRequestBody {
  apiToken: string;
  blueprint: CRMArchitectureBlueprint;
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
    const { apiToken, blueprint } = body;

    if (!apiToken || !blueprint) {
      return NextResponse.json(
        { error: 'Missing required fields: apiToken and blueprint' },
        { status: 400 }
      );
    }

    const deployedPipelines: Array<{ pipeline: PipelineSpec; id: number; stages: any[] }> = [];

    // Loop through pipelines
    for (const pipeline of blueprint.pipelines) {
      try {
        // POST pipeline to Pipedrive
        const pipelineResponse = await fetch(`${PIPEDRIVE_API_BASE}/v1/pipelines?api_token=${apiToken}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: pipeline.name,
            order_nr: pipeline.order_nr,
          }),
        });

        const pipelineData: PipelineResponse = await pipelineResponse.json();

        if (!pipelineData.success || !pipelineData.data?.id) {
          throw new Error(`Failed to create pipeline "${pipeline.name}": ${pipelineData.error || 'Unknown error'}`);
        }

        const pipelineId = pipelineData.data.id;
        const deployedStages = [];

        // Loop through stages for this pipeline
        for (const stage of pipeline.stages) {
          try {
            const stageResponse = await fetch(
              `${PIPEDRIVE_API_BASE}/v1/stages?api_token=${apiToken}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: stage.name,
                  pipeline_id: pipelineId,
                  order_nr: stage.order_nr,
                  deal_probability: stage.deal_probability,
                  rotten_flag: stage.rotten_flag,
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

            deployedStages.push({
              name: stage.name,
              id: stageData.data.id,
            });
          } catch (stageError) {
            throw new Error(
              `Error deploying stage "${stage.name}": ${stageError instanceof Error ? stageError.message : String(stageError)}`
            );
          }
        }

        deployedPipelines.push({
          pipeline,
          id: pipelineId,
          stages: deployedStages,
        });
      } catch (pipelineError) {
        throw new Error(
          `Error deploying pipeline "${pipeline.name}": ${pipelineError instanceof Error ? pipelineError.message : String(pipelineError)}`
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully deployed ${deployedPipelines.length} pipeline(s)`,
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
