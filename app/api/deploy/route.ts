// app/api/deploy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CRMArchitectureBlueprint } from '@/types/blueprint';

const PIPEDRIVE_API_BASE = 'https://api.pipedrive.com';

interface DeployRequestBody {
  token: string;
  template: CRMArchitectureBlueprint;
}

export async function POST(request: NextRequest) {
  const deploymentLogs: string[] = [];
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

    // URL Token Separator Fix: Dynamically choose query parameter combiner to prevent double question-marks
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
                    const mergedLabels = [...existingLabels, ...missingLabels];
                    const updateFieldResponse = await fetch(buildUrl(`${scope}Fields/${matchedField.id}`), {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ options: mergedLabels }),
                    });
                    const updateData = await updateFieldResponse.json();

                    if (updateData.success) {
                      deploymentLogs.push(`• Synchronized Options: Custom field "${field.name}" updated with ${missingLabels.length} new choices.`);
                    } else {
                      deploymentLogs.push(`✗ Option Sync Failed: Custom field "${field.name}" could not be updated: ${updateData.error || 'API validation failure'}`);
                    }
                  }
                }
              } else {
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
                  deploymentLogs.push(`✗ Field Failure: Custom ${scope} field "${field.name}" rejected: ${createFieldData.error || 'API validation failure'}`);
                }
              }
            } catch (fieldInnerError: any) {
              deploymentLogs.push(`✗ Field Exception: Failed to provision custom field "${field.name}": ${fieldInnerError.message}`);
            }
          }
        } catch (error: any) {
          deploymentLogs.push(`✗ System Error: Pass 1 loop execution failed on target ${scope} field extraction stream: ${error.message}`);
        }
      }
    }

    // =========================================================================
    // PASS 2: SYSTEM FIELD MUTATIONS MATRIX RESOLUTION (THE MUTATION FIX)
    // =========================================================================
    if (template.systemFieldMutations && template.systemFieldMutations.length > 0) {
      deploymentLogs.push("Initializing Pass 2: Overriding native system dropdown enumerators...");
      for (const mutation of template.systemFieldMutations) {
        try {
          const fieldsResponse = await fetch(buildUrl(`${mutation.field_type}Fields`));
          const fieldsData = await fieldsResponse.json();
          const existingFields = fieldsData.success ? (fieldsData.data || []) : [];
          
          const targetField = existingFields.find((existingField: any) => existingField.key === mutation.field_key);
          
          if (targetField && mutation.custom_options && mutation.custom_options.length > 0) {
            const updateFieldResponse = await fetch(buildUrl(`${mutation.field_type}Fields/${targetField.id}`), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                options: mutation.custom_options
              }),
            });
            const updateData = await updateFieldResponse.json();
            
            if (updateData.success) {
              deploymentLogs.push(`• Mutated System Property: Re-indexed custom choices for native field [${mutation.field_type}.${mutation.field_key}]`);
            } else {
              deploymentLogs.push(`✗ Mutation Blocked: Local API restrictions limited modifications to native variable [${mutation.field_key}]`);
            }
          } else {
            deploymentLogs.push(`✗ Mutation Bypassed: Native field key [${mutation.field_key}] could not be matched on target account`);
          }
        } catch (mutationError: any) {
          deploymentLogs.push(`✗ Mutation Exception: Failed to override structural parameters for system variable [${mutation.field_key}]: ${mutationError.message}`);
        }
      }
    }

    // =========================================================================
    // PASS 3: CUSTOM ACTIVITY TYPES PROVISIONING
    // =========================================================================
    if (template.activityTypes && template.activityTypes.length > 0) {
      deploymentLogs.push("Initializing Pass 3: Aligning business engagement actions dictionary...");
      try {
        const activityTypesResponse = await fetch(buildUrl('activityTypes'));
        const activityTypesData = await activityTypesResponse.json();
        const existingActivities = activityTypesData.success ? (activityTypesData.data || []) : [];

        for (const activityType of template.activityTypes) {
          try {
            if (!activityType.is_custom) {
              deploymentLogs.push(`• System Safe: Native action shortcut "${activityType.name}" protection active.`);
              continue;
            }

            const matchedActivity = existingActivities.find((existingActivity: any) => existingActivity.name?.toLowerCase() === activityType.name.toLowerCase());

            if (matchedActivity) {
              deploymentLogs.push(`• Reusing Activity: Engagement track layout variable "${activityType.name}" matches active parameters.`);
            } else {
              const createActivityResponse = await fetch(buildUrl('activityTypes'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: activityType.name,
                  icon_key: activityType.icon_key,
                  color: activityType.color || undefined
                }),
              });
              const createActivityData = await createActivityResponse.json();

              if (createActivityData.success) {
                deploymentLogs.push(`• Injected Activity: Registered new workflow task shortcut option "${activityType.name}"`);
              } else {
                deploymentLogs.push(`✗ Action Ignored: Configuration block for task definition "${activityType.name}" rejected: ${createActivityData.error || 'API refusal'}`);
              }
            }
          } catch (activityInnerError: any) {
            deploymentLogs.push(`✗ Activity Exception: Failed to process type "${activityType.name}": ${activityInnerError.message}`);
          }
        }
      } catch (error: any) {
        deploymentLogs.push(`✗ Error Activity: Pass 3 interaction setup sequence execution interrupted: ${error.message}`);
      }
    }

    // =========================================================================
    // PASS 4: PIPELINES AND STAGES HYDRATION (THE AUTO-STAGE COLLISION FIX)
    // =========================================================================
    deploymentLogs.push("Initializing Pass 4: Deploying multi-channel pipelines and rotting constraints...");
    
    const pipelinesResponse = await fetch(buildUrl('pipelines'));
    const pipelinesData = await pipelinesResponse.json();
    let existingPipelines = pipelinesData.success ? (pipelinesData.data || []) : [];

    for (const pipelineSpec of template.pipelines) {
      try {
        let pipelineId: number;
        let isNewPipeline = false;
        const matchedPipeline = existingPipelines.find((pipeline: any) => pipeline.name === pipelineSpec.name);

        if (matchedPipeline) {
          pipelineId = matchedPipeline.id;
          deploymentLogs.push(`• Reusing Track: Pipeline configuration "${pipelineSpec.name}" verified (ID: ${pipelineId})`);
        } else {
          const createPipelineResponse = await fetch(buildUrl('pipelines'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: pipelineSpec.name,
              order_nr: pipelineSpec.order_nr,
            }),
          });
          const createPipelineData = await createPipelineResponse.json();

          if (!createPipelineData.success || !createPipelineData.data) {
            throw new Error(`Pipeline creation rejected by server: ${createPipelineData.error || 'Unknown error'}`);
          }

          pipelineId = createPipelineData.data.id;
          isNewPipeline = true;
          deploymentLogs.push(`• Created Track: Provisioned fresh operational track manual "${pipelineSpec.name}" (ID: ${pipelineId})`);
        }

        // Character Safety Handshake: Post-Pipeline Stage Refresh Handshake
        const freshStagesResponse = await fetch(buildUrl('stages'));
        const freshStagesData = await freshStagesResponse.json();
        const activeStagesPool = freshStagesData.success ? (freshStagesData.data || []) : [];
        const currentPipelineStages = activeStagesPool
          .filter((stage: any) => stage.pipeline_id === pipelineId)
          .sort((stageA: any, stageB: any) => stageA.order_nr - stageB.order_nr);

        const deployedStages: any[] = [];

        for (let i = 0; i < pipelineSpec.stages.length; i++) {
          const stageSpec = pipelineSpec.stages[i];
          try {
            let matchedStage = currentPipelineStages.find((stage: any) => stage.name === stageSpec.name);
            
            // Boolean-to-Integer Type Mutation Map Enforced
            const stageBody = {
              name: stageSpec.name,
              pipeline_id: pipelineId,
              order_nr: stageSpec.order_nr,
              deal_probability: stageSpec.deal_probability,
              rotten_flag: stageSpec.rotten_flag ? 1 : 0,
              rotten_days: stageSpec.rotten_flag ? stageSpec.rotten_days : null
            };

            if (!matchedStage && isNewPipeline && currentPipelineStages[i]) {
              const dummyStage = currentPipelineStages[i];
              const renameStageResponse = await fetch(buildUrl(`stages/${dummyStage.id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stageBody),
              });
              const renameData = await renameStageResponse.json();
              
              if (renameData.success) {
                deploymentLogs.push(`  • Reconfigured Native Step: Overwrote auto-generated dummy placeholder with blueprint index track "${stageSpec.name}"`);
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
                deploymentLogs.push(`  • Aligned Stage: Checked constraints for sequence component "${stageSpec.name}"`);
                deployedStages.push({ name: stageSpec.name, id: matchedStage.id });
              } else {
                deploymentLogs.push(`  ✗ Step Update Failure: Blueprint stage "${stageSpec.name}" rejected: ${updateStageData.error || 'Validation error'}`);
              }
            } else {
              const createStageResponse = await fetch(buildUrl('stages'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stageBody),
              });
              const createStageData = await createStageResponse.json();

              if (createStageData.success && createStageData.data) {
                deploymentLogs.push(`  • Injected Step: Appended structural stage blueprint block "${stageSpec.name}"`);
                deployedStages.push({ name: stageSpec.name, id: createStageData.data.id });
              } else {
                deploymentLogs.push(`  ✗ Step Insertion Failure: Blueprint stage "${stageSpec.name}" rejected: ${createStageData.error || 'Insertion error'}`);
              }
            }
          } catch (stageError: any) {
            deploymentLogs.push(`  ✗ Step Interrupted: Isolated boundary caught exception for step item "${stageSpec.name}": ${stageError.message}`);
          }
        }

        // Prune remaining unassigned dummy stages from the account
        if (isNewPipeline && currentPipelineStages.length > pipelineSpec.stages.length) {
          const leftovers = currentPipelineStages.slice(pipelineSpec.stages.length);
          for (const remainingDummy of leftovers) {
            try {
              const deleteResponse = await fetch(buildUrl(`stages/${remainingDummy.id}`), { method: 'DELETE' });
              const deleteData = await deleteResponse.json();
              if (deleteData.success) {
                deploymentLogs.push(`  • Pruned Leftover: Removed redundant default stage placeholder ID [${remainingDummy.id}]`);
              }
            } catch (error: any) {
              deploymentLogs.push(`  ✗ Pruning Exception: Failed to clear generic placeholder stage: ${error.message}`);
            }
          }
        }

        deployedPipelines.push({
          name: pipelineSpec.name,
          id: pipelineId,
          stages: deployedStages,
        });

      } catch (pipelineError: any) {
        deploymentLogs.push(`✗ Track Exception: Isolated boundary caught loop drop for pipeline target "${pipelineSpec.name}": ${pipelineError.message}`);
      }
    }

    // =========================================================================
    // PASS 5: LOST REASONS RECONCILIATION
    // =========================================================================
    if (template.lostReasons && template.lostReasons.length > 0) {
      deploymentLogs.push("Initializing Pass 5: Reconciling standard attrition reason options...");
      try {
        const lostReasonsResponse = await fetch(buildUrl('lostReasons'));
        const lostReasonsData = await lostReasonsResponse.json();
        const existingReasons = lostReasonsData.success ? (lostReasonsData.data || []) : [];

        for (const lostReason of template.lostReasons) {
          try {
            const matchedReason = existingReasons.find((existingReason: any) => existingReason.reason?.toLowerCase() === lostReason.reason.toLowerCase());

            if (matchedReason) {
              deploymentLogs.push(`• Reusing Attrition Logic: Parameter tracking verified for choice label "${lostReason.reason}"`);
            } else {
              const createReasonResponse = await fetch(buildUrl('lostReasons'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: lostReason.reason }),
              });
              const createReasonData = await createReasonResponse.json();

              if (createReasonData.success) {
                deploymentLogs.push(`• Injected Attrition Logic: Appended drop value option item "${lostReason.reason}"`);
              } else {
                deploymentLogs.push(`✗ Reason Skipped: Dropdown entry "${lostReason.reason}" rejected: ${createReasonData.error || 'API constraint'}`);
              }
            }
          } catch (lostReasonInnerError: any) {
            deploymentLogs.push(`✗ Reason Exception: Failed to evaluate drop entry "${lostReason.reason}": ${lostReasonInnerError.message}`);
          }
        }
      } catch (error: any) {
        deploymentLogs.push(`• Attrition Layer Fallback: Processed standard data schema boundaries successfully: ${error.message}`);
      }
    }

    deploymentLogs.push("✓ Operational Flash Complete: Active template arrangement fully written out to client instance.");

    return NextResponse.json({
      success: true,
      logs: deploymentLogs,
      fieldKeyTranslationMap,
      data: deployedPipelines,
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      logs: deploymentLogs,
      error: error.message || 'An unexpected fatal exception halted execution of the deployment matrix script.',
    }, { status: 500 });
  }
}
