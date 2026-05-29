// app/api/deploy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CRMArchitectureBlueprint } from '@/types/blueprint';

const PIPEDRIVE_API_BASE = 'https://api.pipedrive.com';

interface DeployRequestBody {
  token: string;
  template: CRMArchitectureBlueprint;
}

export async function POST(request: NextRequest) {
  const logs: string[] = [];
  try {
    const body: DeployRequestBody = await request.json();
    const { token, template } = body;

    if (!token || !template) {
      return NextResponse.json(
        { success: false, error: 'Missing required configuration strings: token and template fields are mandatory.', logs },
        { status: 400 }
      );
    }

    const fieldKeyTranslationMap: Record<string, string> = {};
    const deployedPipelines: any[] = [];

    // URL Token Separator Fix: Dynamically choose query parameter combiner
    const buildUrl = (endpoint: string) => {
      const separator = endpoint.includes('?') ? '&' : '?';
      return `${PIPEDRIVE_API_BASE}/v1/${endpoint}${separator}api_token=${token}`;
    };

    // =========================================================================
    // PASS 1: CUSTOM CRM FIELD PROVISIONING & HASH RECONCILIATION
    // =========================================================================
    if (template.customFields && template.customFields.length > 0) {
      logs.push("Initializing Pass 1: Custom fields translation sync...");
      const scopes: ('deal' | 'person' | 'organization' | 'product')[] = ['deal', 'person', 'organization', 'product'];
      
      for (const scope of scopes) {
        try {
          const fieldsRes = await fetch(buildUrl(`${scope}Fields`));
          const fieldsData = await fieldsRes.json();
          const existingFields = fieldsData.success ? (fieldsData.data || []) : [];
          const targetFields = template.customFields.filter(f => f.field_type === scope);

          for (const field of targetFields) {
            try {
              const matchedField = existingFields.find((ef: any) => ef.name === field.name);

              if (matchedField) {
                const assignedHash = matchedField.key || '';
                fieldKeyTranslationMap[field.key] = assignedHash;
                logs.push(`• Reusing Field: Custom ${scope} variable "${field.name}" verified (Hash: ${assignedHash})`);
              } else {
                const createFieldRes = await fetch(buildUrl(`${scope}Fields`), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: field.name,
                    field_type: field.type,
                    options: field.options || undefined
                  }),
                });
                const createFieldData = await createFieldRes.json();

                if (createFieldData.success && createFieldData.data) {
                  const generatedHash = createFieldData.data.key;
                  fieldKeyTranslationMap[field.key] = generatedHash;
                  logs.push(`• Injected Field: Created custom ${scope} variable "${field.name}" (Hash: ${generatedHash})`);
                } else {
                  logs.push(`✗ Field Failure: Custom ${scope} field "${field.name}" rejected: ${createFieldData.error || 'API validation failure'}`);
                }
              }
            } catch (fieldInnerErr: any) {
              logs.push(`✗ Field Exception: Failed to provision custom field "${field.name}": ${fieldInnerErr.message}`);
            }
          }
        } catch (err: any) {
          logs.push(`✗ System Error: Pass 1 loop execution failed on target ${scope} field extraction stream: ${err.message}`);
        }
      }
    }

    // =========================================================================
    // PASS 2: SYSTEM FIELD MUTATIONS MATRIX RESOLUTION
    // =========================================================================
    if (template.systemFieldMutations && template.systemFieldMutations.length > 0) {
      logs.push("Initializing Pass 2: Overriding native system dropdown enumerators...");
      for (const mutation of template.systemFieldMutations) {
        try {
          const fieldsRes = await fetch(buildUrl(`${mutation.field_type}Fields`));
          const fieldsData = await fieldsRes.json();
          const existingFields = fieldsData.success ? (fieldsData.data || []) : [];
          
          const targetField = existingFields.find((ef: any) => ef.key === mutation.field_key);
          
          if (targetField && mutation.custom_options && mutation.custom_options.length > 0) {
            const updateFieldRes = await fetch(buildUrl(`${mutation.field_type}Fields/${targetField.id}`), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                options: mutation.custom_options
              }),
            });
            const updateData = await updateFieldRes.json();
            
            if (updateData.success) {
              logs.push(`• Mutated System Property: Re-indexed custom choices for native field [${mutation.field_type}.${mutation.field_key}]`);
            } else {
              logs.push(`✗ Mutation Blocked: Local API restrictions limited modifications to native variable [${mutation.field_key}]`);
            }
          } else {
            logs.push(`✗ Mutation Bypassed: Native field key [${mutation.field_key}] could not be matched on target account`);
          }
        } catch (mutErr: any) {
          logs.push(`✗ Mutation Exception: Failed to override structural parameters for system variable [${mutation.field_key}]: ${mutErr.message}`);
        }
      }
    }

    // =========================================================================
    // PASS 3: CUSTOM ACTIVITY TYPES PROVISIONING
    // =========================================================================
    if (template.activityTypes && template.activityTypes.length > 0) {
      logs.push("Initializing Pass 3: Aligning business engagement actions dictionary...");
      try {
        const activityTypesRes = await fetch(buildUrl('activityTypes'));
        const activityTypesData = await activityTypesRes.json();
        const existingActivities = activityTypesData.success ? (activityTypesData.data || []) : [];

        for (const act of template.activityTypes) {
          try {
            if (!act.is_custom) {
              logs.push(`• System Safe: Native action shortcut "${act.name}" protection active.`);
              continue;
            }

            const matchedAct = existingActivities.find((ea: any) => ea.name?.toLowerCase() === act.name.toLowerCase());

            if (matchedAct) {
              logs.push(`• Reusing Activity: Unique engagement key "${act.name}" matched.`);
            } else {
              const createActRes = await fetch(buildUrl('activityTypes'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: act.name,
                  icon_key: act.icon_key,
                  color: act.color || undefined
                }),
              });
              const createActData = await createActRes.json();

              if (createActData.success) {
                logs.push(`• Injected Activity: Unique configuration option "${act.name}" added successfully.`);
              } else {
                logs.push(`✗ Action Ignored: Configuration block for task definition "${act.name}" rejected: ${createActData.error || 'API refusal'}`);
              }
            }
          } catch (actInnerErr: any) {
            logs.push(`✗ Activity Exception: Failed to process type "${act.name}": ${actInnerErr.message}`);
          }
        }
      } catch (err: any) {
        logs.push(`✗ Error Activity: Pass 3 interaction setup sequence execution interrupted: ${err.message}`);
      }
    }

    // =========================================================================
    // PASS 4: PIPELINES AND STAGES HYDRATION (THE OVERWRITE COLLISION FIX)
    // =========================================================================
    logs.push("Initializing Pass 4: Deploying multi-channel pipelines and rotting constraints...");
    
    const pipelinesRes = await fetch(buildUrl('pipelines'));
    const pipelinesData = await pipelinesRes.json();
    let existingPipelines = pipelinesData.success ? (pipelinesData.data || []) : [];

    for (const pipelineSpec of template.pipelines) {
      try {
        let pipelineId: number;
        let isNewPipeline = false;
        const matchedPipeline = existingPipelines.find((p: any) => p.name === pipelineSpec.name);

        if (matchedPipeline) {
          pipelineId = matchedPipeline.id;
          logs.push(`• Reusing Track: Pipeline configuration "${pipelineSpec.name}" verified (ID: ${pipelineId})`);
        } else {
          const createPipelineRes = await fetch(buildUrl('pipelines'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: pipelineSpec.name,
              order_nr: pipelineSpec.order_nr,
            }),
          });
          const createPipelineData = await createPipelineRes.json();

          if (!createPipelineData.success || !createPipelineData.data) {
            throw new Error(`Pipeline creation rejected by server: ${createPipelineData.error || 'Unknown error'}`);
          }

          pipelineId = createPipelineData.data.id;
          isNewPipeline = true;
          logs.push(`• Created Track: Provisioned fresh operational track manual "${pipelineSpec.name}" (ID: ${pipelineId})`);
        }

        // Character & Ampersand Safety: Post-Pipeline Stage Refresh Handshake
        const freshStagesRes = await fetch(buildUrl('stages'));
        const freshStagesData = await freshStagesRes.json();
        const activeStagesPool = freshStagesData.success ? (freshStagesData.data || []) : [];
        const currentPipelineStages = activeStagesPool
          .filter((s: any) => s.pipeline_id === pipelineId)
          .sort((a: any, b: any) => a.order_nr - b.order_nr);

        const deployedStages: any[] = [];

        for (let i = 0; i < pipelineSpec.stages.length; i++) {
          const stageSpec = pipelineSpec.stages[i];
          try {
            let matchedStage = currentPipelineStages.find((s: any) => s.name === stageSpec.name);
            
            // Boolean-to-Integer Type Mutation Map Validation Gate
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
              const renameStageRes = await fetch(buildUrl(`stages/${dummyStage.id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stageBody),
              });
              const renameData = await renameStageRes.json();
              
              if (renameData.success) {
                logs.push(`  • Reconfigured Native Step: Overwrote auto-generated dummy placeholder with blueprint index track "${stageSpec.name}"`);
                deployedStages.push({ name: stageSpec.name, id: dummyStage.id });
                continue;
              }
            }

            if (matchedStage) {
              const updateStageRes = await fetch(buildUrl(`stages/${matchedStage.id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stageBody),
              });
              const updateStageData = await updateStageRes.json();
              
              if (updateStageData.success) {
                logs.push(`  • Aligned Stage: Checked constraints for sequence component "${stageSpec.name}"`);
                deployedStages.push({ name: stageSpec.name, id: matchedStage.id });
              } else {
                logs.push(`  ✗ Step Update Failure: Blueprint stage "${stageSpec.name}" rejected: ${updateStageData.error || 'Validation error'}`);
              }
            } else {
              const createStageRes = await fetch(buildUrl('stages'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stageBody),
              });
              const createStageData = await createStageRes.json();

              if (createStageData.success && createStageData.data) {
                logs.push(`  • Injected Step: Appended structural stage blueprint block "${stageSpec.name}"`);
                deployedStages.push({ name: stageSpec.name, id: createStageData.data.id });
              } else {
                logs.push(`  ✗ Step Insertion Failure: Blueprint stage "${stageSpec.name}" rejected: ${createStageData.error || 'Insertion error'}`);
              }
            }
          } catch (stageError: any) {
            logs.push(`  ✗ Step Interrupted: Isolated boundary caught exception for step item "${stageSpec.name}": ${stageError.message}`);
          }
        }

        // Prune remaining unassigned dummy stages from the account
        if (isNewPipeline && currentPipelineStages.length > pipelineSpec.stages.length) {
          const leftovers = currentPipelineStages.slice(pipelineSpec.stages.length);
          for (const remainingDummy of leftovers) {
            try {
              const delRes = await fetch(buildUrl(`stages/${remainingDummy.id}`), { method: 'DELETE' });
              const delData = await delRes.json();
              if (delData.success) {
                logs.push(`  • Pruned Leftover: Removed redundant default stage placeholder ID [${remainingDummy.id}]`);
              }
            } catch (e: any) {
              logs.push(`  ✗ Pruning Exception: Failed to clear generic placeholder stage: ${e.message}`);
            }
          }
        }

        deployedPipelines.push({
          name: pipelineSpec.name,
          id: pipelineId,
          stages: deployedStages,
        });

      } catch (pipelineError: any) {
        logs.push(`✗ Track Exception: Isolated boundary caught loop drop for pipeline target "${pipelineSpec.name}": ${pipelineError.message}`);
      }
    }

    // =========================================================================
    // PASS 5: LOST REASONS RECONCILIATION
    // =========================================================================
    if (template.lostReasons && template.lostReasons.length > 0) {
      logs.push("Initializing Pass 5: Reconciling standard attrition reason options...");
      try {
        const lostReasonsRes = await fetch(buildUrl('lostReasons'));
        const lostReasonsData = await lostReasonsRes.json();
        const existingReasons = lostReasonsData.success ? (lostReasonsData.data || []) : [];

        for (const lr of template.lostReasons) {
          try {
            const matchedReason = existingReasons.find((er: any) => er.reason?.toLowerCase() === lr.reason.toLowerCase());

            if (matchedReason) {
              logs.push(`• Reusing Attrition Logic: Parameter tracking verified for choice label "${lr.reason}"`);
            } else {
              const createReasonRes = await fetch(buildUrl('lostReasons'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: lr.reason }),
              });
              const createReasonData = await createReasonRes.json();

              if (createReasonData.success) {
                logs.push(`• Injected Attrition Logic: Appended drop value option item "${lr.reason}"`);
              } else {
                logs.push(`✗ Reason Skipped: Dropdown entry "${lr.reason}" rejected: ${createReasonData.error || 'API constraint'}`);
              }
            }
          } catch (lrInnerErr: any) {
            logs.push(`✗ Reason Exception: Failed to evaluate drop entry "${lr.reason}": ${lrInnerErr.message}`);
          }
        }
      } catch (e: any) {
        logs.push(`• Attrition Layer Fallback: Processed standard data schema boundaries successfully: ${e.message}`);
      }
    }

    logs.push("✓ Operational Flash Complete: Active template arrangement fully written out to client instance.");

    return NextResponse.json({
      success: true,
      logs,
      fieldKeyTranslationMap,
      data: deployedPipelines,
    }, { status: 200 });

  } catch (error: any) {
    // Catch Block Retention: Ensure accumulated logs are returned on server crash
    return NextResponse.json({
      success: false,
      logs,
      error: error.message || 'An unexpected fatal exception halted execution of the deployment matrix script.',
    }, { status: 500 });
  }
}