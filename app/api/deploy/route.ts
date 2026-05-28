// app/api/deploy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CRMArchitectureBlueprint } from '@/types/blueprint';

const API_BASE = 'https://api.pipedrive.com/v1';

export async function POST(request: NextRequest) {
  try {
    const { token, template }: { token: string; template: CRMArchitectureBlueprint } = await request.json();
    if (!token || !template) return NextResponse.json({ error: 'Missing token or template' }, { status: 400 });

    const logs: string[] = [];
    const fieldKeyTranslationMap: Record<string, string> = {};
    const auth = `?api_token=${token}`;

    const getExisting = async (endpoint: string) => {
      try {
        const res = await fetch(`${API_BASE}/${endpoint}${auth}`);
        const json = await res.json();
        return json && json.success && Array.isArray(json.data) ? json.data : [];
      } catch (e) {
        logs.push(`✗ API Error: Failed to fetch existing ${endpoint.split('?')[0]}`);
        return [];
      }
    };

    // =========================================================================
    // PASS 1: CUSTOM FIELDS (HASH RECONCILIATION)
    // =========================================================================
    if (template.customFields && Array.isArray(template.customFields)) {
      for (const field of template.customFields) {
        if (!field) continue;
        const endpoint = `${field.field_type}Fields`;
        const existing = await getExisting(endpoint);
        const match = existing.find((f: any) => f && f.name === field.name);

        if (match) {
          fieldKeyTranslationMap[field.key] = match.key;
          logs.push(`• Resolved Field: Mapped pre-existing custom field '${field.name}' [${field.field_type}] to hash ${match.key}`);
        } else {
          try {
            const res = await fetch(`${API_BASE}/${endpoint}${auth}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: field.name, field_type: field.type, options: field.options })
            });
            const data = await res.json();
            if (data && data.success && data.data) {
              fieldKeyTranslationMap[field.key] = data.data.key;
              logs.push(`• Injected Field: Created custom field '${field.name}' under schema [${field.field_type}] (Key: ${data.data.key})`);
            } else {
              logs.push(`✗ Failed Field: Could not provision '${field.name}' - ${data?.error || 'Unknown error'}`);
            }
          } catch (e) {
            logs.push(`✗ Critical Error: Field '${field.name}' creation failed.`);
          }
        }
      }
    }

    // =========================================================================
    // PASS 2: SYSTEM FIELD MUTATIONS (PUT STREAM)
    // =========================================================================
    if (template.systemFieldMutations && Array.isArray(template.systemFieldMutations)) {
      for (const mutation of template.systemFieldMutations) {
        if (!mutation) continue;
        const endpoint = `${mutation.field_type}Fields`;
        const fields = await getExisting(endpoint);
        const targetField = fields.find((f: any) => f && f.key === mutation.field_key);

        if (targetField && targetField.id) {
          try {
            const res = await fetch(`${API_BASE}/${endpoint}/${targetField.id}${auth}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ options: mutation.custom_options })
            });
            const data = await res.json();
            if (data && data.success) {
              logs.push(`• Mutated Field: Updated system labels for native field '${mutation.field_key}' [${mutation.field_type}]`);
            } else {
              logs.push(`✗ Mutation Bypassed: Variable '${mutation.field_key}' could not be resolved on target instance.`);
            }
          } catch (e) {
            logs.push(`✗ Error: Pass 2 loop execution failed on target ${mutation.field_key} field mutation.`);
          }
        } else {
          logs.push(`✗ Mutation Bypassed: Native field '${mutation.field_key}' not found.`);
        }
      }
    }

    // =========================================================================
    // PASS 3: CUSTOM ACTIVITIES
    // =========================================================================
    if (template.activityTypes && Array.isArray(template.activityTypes)) {
      const existing = await getExisting('activityTypes');
      for (const act of template.activityTypes) {
        if (!act || !act.is_custom) continue;
        if (!existing.find((e: any) => e && e.name && e.name.toLowerCase() === act.name.toLowerCase())) {
          try {
            const res = await fetch(`${API_BASE}/activityTypes${auth}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: act.name, icon_key: act.icon_key, color: act.color })
            });
            const data = await res.json();
            if (data && data.success) {
              logs.push(`• Injected Activity: Unique tracking block '${act.name}' provisioned`);
            }
          } catch (e) {
            logs.push(`✗ Error: Pass 3 interaction pipeline crashed during activity tracking setup.`);
          }
        }
      }
    }

    // =========================================================================
    // PASS 4: PIPELINES & STAGES (COLLISION FIX)
    // =========================================================================
    if (template.pipelines && Array.isArray(template.pipelines)) {
      const existingPipelines = await getExisting('pipelines');
      for (const pipeSpec of template.pipelines) {
        if (!pipeSpec) continue;
        let pipelineId: number;
        const match = existingPipelines.find((p: any) => p && p.name === pipeSpec.name);

        try {
          if (match && match.id) {
            pipelineId = match.id;
            logs.push(`• Reusing Pipeline: Structure "${pipeSpec.name}" verified (ID: ${pipelineId})`);
          } else {
            const res = await fetch(`${API_BASE}/pipelines${auth}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: pipeSpec.name, order_nr: pipeSpec.order_nr, deal_probability: pipeSpec.deal_probability ? 1 : 0 })
            });
            const data = await res.json();
            if (data && data.success && data.data && data.data.id) {
              pipelineId = data.data.id;
              logs.push(`• Created Pipeline: Channel "${pipeSpec.name}" provisioned (ID: ${pipelineId})`);
            } else {
              logs.push(`✗ Error: Channel creation failed for pipeline "${pipeSpec.name}".`);
              continue;
            }
          }

          // STAGE RECONCILIATION
          const currentStages = await getExisting(`stages?pipeline_id=${pipelineId}`);
          const targetStages = Array.isArray(pipeSpec.stages) ? pipeSpec.stages : [];
          
          for (let i = 0; i < targetStages.length; i++) {
            const stageSpec = targetStages[i];
            if (!stageSpec) continue;

            if (i < currentStages.length && currentStages[i] && currentStages[i].id) {
              // OVERWRITE DEFAULT STAGE
              await fetch(`${API_BASE}/stages/${currentStages[i].id}${auth}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...stageSpec, pipeline_id: pipelineId })
              });
              logs.push(`  • Overwritten Stage: Renamed default placeholder to '${stageSpec.name}'`);
            } else {
              // INJECT NEW STAGE
              await fetch(`${API_BASE}/stages${auth}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...stageSpec, pipeline_id: pipelineId })
              });
              logs.push(`  • Injected Stage: Flow step '${stageSpec.name}' added to sequence`);
            }
          }

          // DELETE REMAINING DUMMY STAGES
          if (currentStages.length > targetStages.length) {
            for (let j = targetStages.length; j < currentStages.length; j++) {
              if (currentStages[j] && currentStages[j].id) {
                await fetch(`${API_BASE}/stages/${currentStages[j].id}${auth}`, { method: 'DELETE' });
                logs.push(`  • Pruned Stage: Removed unused default placeholder ID ${currentStages[j].id}`);
              }
            }
          }
        } catch (e) {
          logs.push(`✗ Error: Fatal interruption during Pass 4 pipeline/stage reconciliation.`);
        }
      }
    }

    // =========================================================================
    // PASS 5: LOST REASONS
    // =========================================================================
    if (template.lostReasons && Array.isArray(template.lostReasons)) {
      const existing = await getExisting('lostReasons');
      for (const lr of template.lostReasons) {
        if (!lr || !lr.reason) continue;
        if (!existing.find((e: any) => e && e.label && e.label.toLowerCase() === lr.reason.toLowerCase())) {
          try {
            await fetch(`${API_BASE}/lostReasons${auth}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ label: lr.reason })
            });
            logs.push(`• Injected Reason: Churn field value '${lr.reason}' committed`);
          } catch (e) {
            logs.push(`✗ Error: Lost reason setup failed.`);
          }
        }
      }
    }

    return NextResponse.json({ success: true, logs, fieldKeyTranslationMap });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
