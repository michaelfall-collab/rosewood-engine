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
      const res = await fetch(`${API_BASE}/${endpoint}${auth}`);
      const json = await res.json();
      return json.success ? (json.data || []) : [];
    };

    // =========================================================================
    // PASS 1: CUSTOM FIELDS (HASH RECONCILIATION)
    // =========================================================================
    if (template.customFields) {
      for (const field of template.customFields) {
        const endpoint = `${field.field_type}Fields`;
        const existing = await getExisting(endpoint);
        const match = existing.find((f: any) => f.name === field.name);

        if (match) {
          fieldKeyTranslationMap[field.key] = match.key;
          logs.push(`• Resolved Field: Mapped pre-existing custom field '${field.name}' [${field.field_type}] to hash ${match.key}`);
        } else {
          const res = await fetch(`${API_BASE}/${endpoint}${auth}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: field.name, field_type: field.type, options: field.options })
          });
          const data = await res.json();
          if (data.success) {
            fieldKeyTranslationMap[field.key] = data.data.key;
            logs.push(`• Injected Field: Created custom field '${field.name}' under schema [${field.field_type}] (Key: ${data.data.key})`);
          } else {
            logs.push(`✗ Failed Field: Could not provision '${field.name}' - ${data.error}`);
          }
        }
      }
    }

    // =========================================================================
    // PASS 2: SYSTEM FIELD MUTATIONS (PUT STREAM)
    // =========================================================================
    if (template.systemFieldMutations) {
      for (const mutation of template.systemFieldMutations) {
        const endpoint = `${mutation.field_type}Fields`;
        const fields = await getExisting(endpoint);
        const targetField = fields.find((f: any) => f.key === mutation.field_key);

        if (targetField) {
          const res = await fetch(`${API_BASE}/${endpoint}/${targetField.id}${auth}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ options: mutation.custom_options })
          });
          const data = await res.json();
          if (data.success) {
            logs.push(`• Mutated Field: Updated system labels for native field '${mutation.field_key}' [${mutation.field_type}]`);
          }
        }
      }
    }

    // =========================================================================
    // PASS 3: CUSTOM ACTIVITIES
    // =========================================================================
    if (template.activityTypes) {
      const existing = await getExisting('activityTypes');
      for (const act of template.activityTypes) {
        if (!act.is_custom) continue;
        if (!existing.find((e: any) => e.name.toLowerCase() === act.name.toLowerCase())) {
          await fetch(`${API_BASE}/activityTypes${auth}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: act.name, icon_key: act.icon_key, color: act.color })
          });
          logs.push(`• Injected Activity: Unique tracking block '${act.name}' provisioned`);
        }
      }
    }

    // =========================================================================
    // PASS 4: PIPELINES & STAGES (COLLISION FIX)
    // =========================================================================
    const existingPipelines = await getExisting('pipelines');
    for (const pipeSpec of template.pipelines) {
      let pipelineId: number;
      const match = existingPipelines.find((p: any) => p.name === pipeSpec.name);

      if (match) {
        pipelineId = match.id;
        logs.push(`• Reusing Pipeline: Structure "${pipeSpec.name}" verified (ID: ${pipelineId})`);
      } else {
        const res = await fetch(`${API_BASE}/pipelines${auth}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: pipeSpec.name, order_nr: pipeSpec.order_nr, deal_probability: pipeSpec.deal_probability ? 1 : 0 })
        });
        const data = await res.json();
        pipelineId = data.data.id;
        logs.push(`• Created Pipeline: Channel "${pipeSpec.name}" provisioned (ID: ${pipelineId})`);
      }

      // STAGE RECONCILIATION
      const currentStages = await getExisting(`stages?pipeline_id=${pipelineId}`);
      for (let i = 0; i < pipeSpec.stages.length; i++) {
        const stageSpec = pipeSpec.stages[i];
        if (i < currentStages.length) {
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
      if (currentStages.length > pipeSpec.stages.length) {
        for (let j = pipeSpec.stages.length; j < currentStages.length; j++) {
          await fetch(`${API_BASE}/stages/${currentStages[j].id}${auth}`, { method: 'DELETE' });
          logs.push(`  • Pruned Stage: Removed unused default placeholder ID ${currentStages[j].id}`);
        }
      }
    }

    // =========================================================================
    // PASS 5: LOST REASONS
    // =========================================================================
    if (template.lostReasons) {
      const existing = await getExisting('lostReasons');
      for (const lr of template.lostReasons) {
        if (!existing.find((e: any) => e.label.toLowerCase() === lr.reason.toLowerCase())) {
          await fetch(`${API_BASE}/lostReasons${auth}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: lr.reason })
          });
          logs.push(`• Injected Reason: Churn field value '${lr.reason}' committed`);
        }
      }
    }

    return NextResponse.json({ success: true, logs, fieldKeyTranslationMap });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
