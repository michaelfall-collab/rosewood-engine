// app/api/deploy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CRMArchitectureBlueprint } from '@/types/blueprint';

const PIPEDRIVE_API_BASE = 'https://api.pipedrive.com';

interface DeployRequestBody {
  token: string;
  template: CRMArchitectureBlueprint;
}

// Rate Limiting Prevention: Helper utility to pause execution thread
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  const deploymentLogs: string[] = [];
  let hasFailures = false;
  
  try {
    const body: DeployRequestBody = await request.json();
    const { token, template } = body;

    if (!token || !template) {
      return NextResponse.json(
        { success: false, error: 'Missing required configuration strings: token and template fields are mandatory.', logs: deploymentLogs },
        { status: 400 }
      );
    }

    const fieldKeyTranslationMap: Record<string, string> = {};
    const deployedPipelines: any[] = [];

    const buildUrl = (endpoint: string) => {
      const separator = endpoint.includes('?') ? '&' : '?';
      return `${PIPEDRIVE_API_BASE}/v1/${endpoint}${separator}api_token=${token}`;
    };

    // =========================================================================
    // PASS 1: CUSTOM DATA FIELD PROVISIONING & HASH RECONCILIATION
    // =========================================================================
    if (template.customFields && template.customFields.length > 0) {
      deploymentLogs.push("Initializing Pass 1: Custom fields translation sync...");
      const scopes: ('deal' | 'person' | 'organization' | 'product')[] = ['deal', 'person', 'organization', 'product'];
      
      for (const scope of scopes) {
        try {
          await sleep(150); // Rate Limit Guard
          const fieldsResponse = await fetch(buildUrl(`${scope}Fields`));
          const fieldsData = await fieldsResponse.json();
          const existingFields = fieldsData.success ? (fieldsData.data || []) : [];
          const targetFields = template.customFields.filter(f => f.field_type === scope);

          for (const field of targetFields) {
            try {
              const matchedField = existingFields.find((existingField: any) => existingField.name === field.name);

              if (matchedField) {
                const assignedHash = matchedField.key || '';
                fieldKeyTranslationMap[field.key] = assignedHash;
                deploymentLogs.push(`• Reusing Field: Custom field "${field.name}" verified under scope [${scope}] (Hash: ${assignedHash})`);

                if (['enum', 'set'].includes(field.type) && field.options && field.options.length > 0) {
                  const remoteOptions = matchedField.options || [];
                  const existingLabels = remoteOptions.map((opt: any) => opt.label);
                  const newOptionLabels = field.options.map(opt => typeof opt === "string" ? opt : opt.label);
                  const missingLabels = newOptionLabels.filter(label => !existingLabels.includes(label));

                  if (missingLabels.length > 0) {
                    await sleep(100);
                    const mergedLabels = [...existingLabels, ...missingLabels];
                    const updateFieldResponse = await fetch(buildUrl(`${scope}Fields/${matchedField.id}`), {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ options: mergedLabels }),
                    });
                    const updateData = await updateFieldResponse.json();

                    if (updateData.success) {
                      deploymentLogs.push(`• Synchronized Options: Custom field "${field.name}" updated with new choices.`);
                    } else {
                      hasFailures = true;
                      deploymentLogs.push(`✗ Option Sync Failed: Custom field "${field.name}" rejected update.`);
                    }
                  }
                }
              } else {
                await sleep(100);
                const createFieldResponse = await fetch(buildUrl(`${scope}Fields`), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: field.name,
                    field_type: field.type,
                    options: field.options ? field.options.map(option => typeof option === "string" ? option : option.label) : undefined
                  }),
                });
                const createFieldData = await createFieldResponse.json();

                if (createFieldData.success && createFieldData.data) {
                  const generatedHash = createFieldData.data.key;
                  fieldKeyTranslationMap[field.key] = generatedHash;
                  deploymentLogs.push(`• Injected Field: Created custom field "${field.name}" under scope [${scope}] (Hash: ${generatedHash})`);
                } else {
                  hasFailures = true;
                  deploymentLogs.push(`✗ Field Failure: Custom ${scope} field "${field.name}" rejected.`);
                }
              }
            } catch (inner) {
              hasFailures = true;
              deploymentLogs.push(`✗ Field Exception for "${field.name}"`);
            }
          }
        } catch (error: any) {
          hasFailures = true;
          deploymentLogs.push(`✗ System Error on Pass 1 [${scope}]`);
        }
      }
    }

    // =========================================================================
    // PASS 2: SYSTEM FIELD MUTATIONS MATRIX RESOLUTION
    // =========================================================================
    if (template.systemFieldMutations && template.systemFieldMutations.length > 0) {
      deploymentLogs.push("Initializing Pass 2: Overriding native system dropdown enumerators...");
      for (const mutation of template.systemFieldMutations) {
        try {
          await sleep(150);
          const fieldsResponse = await fetch(buildUrl(`${mutation.field_type}Fields`));
          const fieldsData = await fieldsResponse.json();
          const existingFields = fieldsData.success ? (fieldsData.data || []) : [];
          const targetField = existingFields.find((existingField: any) => existingField.key === mutation.field_key);
          
          if (targetField && mutation.custom_options && mutation.custom_options.length > 0) {
            await sleep(100);
            const updateFieldResponse = await fetch(buildUrl(`${mutation.field_type}Fields/${targetField.id}`), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ options: mutation.custom_options }),
            });
            const updateData = await updateFieldResponse.json();
            if (updateData.success) {
              deploymentLogs.push(`• Mutated System Property: Re-indexed custom choices for [${mutation.field_key}]`);
            }
          }
        } catch (e) {
          hasFailures = true;
        }
      }
    }

    // =========================================================================
    // PASS 3: CUSTOM ACTIVITY TYPES PROVISIONING
    // =========================================================================
    if (template.activityTypes && template.activityTypes.length > 0) {
      deploymentLogs.push("Initializing Pass 3: Aligning business engagement actions dictionary...");
      try {
        await sleep(150);
        const activityTypesResponse = await fetch(buildUrl('activityTypes'));
        const activityTypesData = await activityTypesResponse.json();
        const existingActivities = activityTypesData.success ? (activityTypesData.data || []) : [];

        for (const activityType of template.activityTypes) {
          if (!activityType.is_custom) continue;
          const matchedActivity = existingActivities.find((ea: any) => ea.name?.toLowerCase() === activityType.name.toLowerCase());

          if (!matchedActivity) {
            await sleep(100);
            await fetch(buildUrl('activityTypes'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: activityType.name, icon_key: activityType.icon_key, color: activityType.color }),
            });
            deploymentLogs.push(`• Injected Activity: Registered option "${activityType.name}"`);
          }
        }
      } catch (e) {
        hasFailures = true;
      }
    }

    // =========================================================================
    // PASS 4: PIPELINES AND STAGES HYDRATION (PAGINATION BUG RESOLVED)
    // =========================================================================
    deploymentLogs.push("Initializing Pass 4: Deploying multi-channel pipelines...");
    await sleep(200);
    const pipelinesResponse = await fetch(buildUrl('pipelines'));
    const pipelinesData = await pipelinesResponse.json();
    let existingPipelines = pipelinesData.success ? (pipelinesData.data || []) : [];

    for (const pipelineSpec of template.pipelines) {
      try {
        let pipelineId: number;
        let isNewPipeline = false;
        const matchedPipeline = existingPipelines.find((p: any) => p.name === pipelineSpec.name);

        if (matchedPipeline) {
          pipelineId = matchedPipeline.id;
          deploymentLogs.push(`• Reusing Track: Pipeline configuration "${pipelineSpec.name}" verified (ID: ${pipelineId})`);
        } else {
          await sleep(150);
          const createPipelineResponse = await fetch(buildUrl('pipelines'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: pipelineSpec.name, order_nr: pipelineSpec.order_nr }),
          });
          const createPipelineData = await createPipelineResponse.json();

          if (!createPipelineData.success || !createPipelineData.data) {
            throw new Error(`Pipeline execution creation refused by Pipedrive server instance.`);
          }

          pipelineId = createPipelineData.data.id;
          isNewPipeline = true;
          deploymentLogs.push(`• Created Track: Provisioned fresh operational track "${pipelineSpec.name}" (ID: ${pipelineId})`);
        }

        // 🚀 FIXED: Request stages targeting ONLY this pipeline ID to prevent pagination data dropouts
        await sleep(150);
        const freshStagesResponse = await fetch(buildUrl(`stages?pipeline_id=${pipelineId}`));
        const freshStagesData = await freshStagesResponse.json();
        const currentPipelineStages = freshStagesData.success ? (freshStagesData.data || []) : [];
        currentPipelineStages.sort((stageA: any, stageB: any) => stageA.order_nr - stageB.order_nr);

        const deployedStages: any[] = [];

        for (let i = 0; i < pipelineSpec.stages.length; i++) {
          const stageSpec = pipelineSpec.stages[i];
          await sleep(100);
          
          let matchedStage = currentPipelineStages.find((s: any) => s.name === stageSpec.name);
          
          const stageBody = {
            name: stageSpec.name,
            pipeline_id: pipelineId,
            order_nr: stageSpec.order_nr,
            deal_probability: stageSpec.deal_probability,
            rotten_flag: stageSpec.rotten_flag ? 1 : 0,
            rotten_days: stageSpec.rotten_flag ? stageSpec.rotten_days : null
          };

          // Overwrite default stages if this is a newly created pipeline
          if (!matchedStage && isNewPipeline && currentPipelineStages[i]) {
            const dummyStage = currentPipelineStages[i];
            const renameStageResponse = await fetch(buildUrl(`stages/${dummyStage.id}`), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(stageBody),
            });
            const renameData = await renameStageResponse.json();
            if (renameData.success) {
              deploymentLogs.push(`  • Reconfigured Native Step: Overwrote placeholder with "${stageSpec.name}"`);
              deployedStages.push({ name: stageSpec.name, id: dummyStage.id });
              continue;
            }
          }

          if (matchedStage) {
            const updateStageResponse = await fetch(buildUrl(`stages/${matchedStage.id}`), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(stageBody),
            });
            const updateStageData = await updateStageResponse.json();
            if (updateStageData.success) {
              deploymentLogs.push(`  • Aligned Stage: Checked constraints for "${stageSpec.name}"`);
              deployedStages.push({ name: stageSpec.name, id: matchedStage.id });
            }
          } else {
            const createStageResponse = await fetch(buildUrl('stages'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(stageBody),
            });
            const createStageData = await createStageResponse.json();
            if (createStageData.success && createStageData.data) {
              deploymentLogs.push(`  • Injected Step: Appended structural stage "${stageSpec.name}"`);
              deployedStages.push({ name: stageSpec.name, id: createStageData.data.id });
            } else {
              hasFailures = true;
              deploymentLogs.push(`  ✗ Step Insertion Failure for "${stageSpec.name}": ${createStageData.error}`);
            }
          }
        }

        // Prune remaining unassigned dummy stages from the account
        if (isNewPipeline && currentPipelineStages.length > pipelineSpec.stages.length) {
          const leftovers = currentPipelineStages.slice(pipelineSpec.stages.length);
          for (const remainingDummy of leftovers) {
            await sleep(50);
            await fetch(buildUrl(`stages/${remainingDummy.id}`), { method: 'DELETE' });
            deploymentLogs.push(`  • Pruned Leftover placeholder stage ID [${remainingDummy.id}]`);
          }
        }

        deployedPipelines.push({ name: pipelineSpec.name, id: pipelineId, stages: deployedStages });

      } catch (pipelineError: any) {
        hasFailures = true;
        deploymentLogs.push(`✗ Track Exception for "${pipelineSpec.name}": ${pipelineError.message}`);
      }
    }

    // =========================================================================
    // PASS 5: LOST REASONS RECONCILIATION
    // =========================================================================
    if (template.lostReasons && template.lostReasons.length > 0) {
      deploymentLogs.push("Initializing Pass 5: Reconciling standard attrition reason options...");
      try {
        await sleep(150);
        const lostReasonsResponse = await fetch(buildUrl('lostReasons'));
        const lostReasonsData = await lostReasonsResponse.json();
        const existingReasons = lostReasonsData.success ? (lostReasonsData.data || []) : [];

        for (const lostReason of template.lostReasons) {
          const matchedReason = existingReasons.find((er: any) => er.reason?.toLowerCase() === lostReason.reason.toLowerCase());
          if (!matchedReason) {
            await sleep(50);
            await fetch(buildUrl('lostReasons'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason: lostReason.reason }),
            });
          }
        }
      } catch (e) {
        hasFailures = true;
      }
    }

    deploymentLogs.push("✓ Operational Flash Complete: Matrix configuration sync cycle complete.");

    return NextResponse.json({
      success: !hasFailures,
      logs: deploymentLogs,
      fieldKeyTranslationMap,
      data: deployedPipelines,
    }, { status: hasFailures ? 207 : 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      logs: deploymentLogs,
      error: error.message || 'Fatal execution matrix handler crash.',
    }, { status: 500 });
  }
}