import { NextRequest, NextResponse } from 'next/server';
import { CRMArchitectureBlueprint, PipelineSpec, PipelineStageSpec } from '@/types/blueprint';

const PIPEDRIVE_API_BASE = 'https://api.pipedrive.com';

interface DeployRequestBody {
  token: string;
  template: CRMArchitectureBlueprint;
}

interface PipedrivePipeline {
  id: number;
  name: string;
}

interface PipedriveStage {
  id: number;
  name: string;
  pipeline_id: number;
}

interface PipedriveAPIResponse<T> {
  success: boolean;
  data: T | null;
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
    const deployedPipelines: { name: string; id: number; stages: { name: string; id: number }[] }[] = [];

    // 1. Before creating any new structures, perform a 'GET' request to fetch all existing pipelines and stages
    const pipelinesRes = await fetch(`${PIPEDRIVE_API_BASE}/v1/pipelines?api_token=${token}`);
    const pipelinesData: PipedriveAPIResponse<PipedrivePipeline[]> = await pipelinesRes.json();
    const existingPipelines = pipelinesData.success ? (pipelinesData.data || []) : [];

    const stagesRes = await fetch(`${PIPEDRIVE_API_BASE}/v1/stages?api_token=${token}`);
    const stagesData: PipedriveAPIResponse<PipedriveStage[]> = await stagesRes.json();
    const existingStages = stagesData.success ? (stagesData.data || []) : [];

    // 2. Loop through the incoming 'template.pipelines'
    for (const pipelineSpec of template.pipelines) {
      try {
        let pipelineId: number;
        
        // Check if a pipeline with the exact same name already exists
        const matchedPipeline = existingPipelines.find(p => p.name === pipelineSpec.name);

        if (matchedPipeline) {
          // If it matches by name, DO NOT create a new one. Reuse the existing pipeline's ID
          pipelineId = matchedPipeline.id;
          logs.push(`• Reusing: Pipeline "${pipelineSpec.name}" already exists (ID: ${pipelineId})`);
        } else {
          // If it does not exist, send a 'POST' to create it
          const createPipelineRes = await fetch(`${PIPEDRIVE_API_BASE}/v1/pipelines?api_token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: pipelineSpec.name,
              order_nr: pipelineSpec.order_nr,
            }),
          });
          const createPipelineData: PipedriveAPIResponse<PipedrivePipeline> = await createPipelineRes.json();

          if (!createPipelineData.success || !createPipelineData.data) {
            throw new Error(`Failed to create pipeline "${pipelineSpec.name}": ${createPipelineData.error || 'Unknown error'}`);
          }

          pipelineId = createPipelineData.data.id;
          logs.push(`• Created: Pipeline "${pipelineSpec.name}" (ID: ${pipelineId})`);
        }

        const deployedStages: { name: string; id: number }[] = [];

        // 3. Inside the stages loop for each pipeline
        for (const stageSpec of pipelineSpec.stages) {
          try {
            // Check if a stage with the exact same name already exists specifically within that pipeline channel's ID
            const matchedStage = existingStages.find(s => s.pipeline_id === pipelineId && s.name === stageSpec.name);

            if (matchedStage) {
              // If it exists in that pipeline, skip the creation step entirely
              logs.push(`• Skipped: Stage "${stageSpec.name}" already exists in this pipeline`);
              deployedStages.push({ name: stageSpec.name, id: matchedStage.id });
            } else {
              // If it is entirely unique, issue a 'POST /v1/stages' request
              const createStageRes = await fetch(`${PIPEDRIVE_API_BASE}/v1/stages?api_token=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: stageSpec.name,
                  pipeline_id: pipelineId,
                  order_nr: stageSpec.order_nr,
                  deal_probability: stageSpec.deal_probability,
                  rotten_flag: stageSpec.rotten_flag,
                  rotten_days: stageSpec.rotten_days,
                }),
              });
              const createStageData: PipedriveAPIResponse<PipedriveStage> = await createStageRes.json();

              if (!createStageData.success || !createStageData.data) {
                throw new Error(`Failed to create stage "${stageSpec.name}": ${createStageData.error || 'Unknown error'}`);
              }

              logs.push(`• Injected: Stage "${stageSpec.name}" into "${pipelineSpec.name}"`);
              deployedStages.push({ name: stageSpec.name, id: createStageData.data.id });
            }
          } catch (stageError) {
            logs.push(`✗ Error with stage "${stageSpec.name}": ${stageError instanceof Error ? stageError.message : String(stageError)}`);
          }
        }

        deployedPipelines.push({
          name: pipelineSpec.name,
          id: pipelineId,
          stages: deployedStages,
        });

      } catch (pipelineError) {
        logs.push(`✗ Error with pipeline "${pipelineSpec.name}": ${pipelineError instanceof Error ? pipelineError.message : String(pipelineError)}`);
      }
    }

    return NextResponse.json({
      success: true,
      logs,
      data: deployedPipelines,
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred during deployment',
    }, { status: 500 });
  }
}
