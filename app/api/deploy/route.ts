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

    // PASS 1: CUSTOM FIELDS
    if (template.customFields) {
      for (const fieldSpec of template.customFields) {
        const endpoint = `${fieldSpec.field_type}Fields`;
        const existing = await getExisting(endpoint);
        const match = existing.find((f: any) => f.name === fieldSpec.name);

        if (match) {
          fieldKeyTranslationMap[fieldSpec.key] = match.key;
          logs.push(`• Reusing Custom ${fieldSpec.field_type} Field: '${fieldSpec.name}' (Key: ${match.key})`);
        } else {
          const res = await fetch(`${API_BASE}/${endpoint}${auth}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: fieldSpec.name,
              field_type: fieldSpec.type,
              options: fieldSpec.options
            })
          });
          const data = await res.json();
          if (data.success) {
            fieldKeyTranslationMap[fieldSpec.key] = data.data.key;
            logs.push(`• Injected Custom ${fieldSpec.field_type} Field: '${fieldSpec.name}' (New Key: ${data.data.key})`);
          } else {
            logs.push(`✗ Failed Field: '${fieldSpec.name}' - ${data.error}`);
          }
        }
      }
    }

    // PASS 2: PIPELINES & STAGES
    const existingPipelines = await getExisting('pipelines');
    const existingStages = await getExisting('stages');

    for (const pipeSpec of template.pipelines) {
      let pipelineId: number;
      const match = existingPipelines.find((p: any) => p.name === pipeSpec.name);

      if (match) {
        pipelineId = match.id;
        logs.push(`• Reusing Pipeline: "${pipeSpec.name}" (ID: ${pipelineId})`);
      } else {
        const res = await fetch(`${API_BASE}/pipelines${auth}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: pipeSpec.name, order_nr: pipeSpec.order_nr })
        });
        const data = await res.json();
        pipelineId = data.data.id;
        logs.push(`• Created Pipeline: "${pipeSpec.name}" (ID: ${pipelineId})`);
      }

      for (const stageSpec of pipeSpec.stages) {
        const stageMatch = existingStages.find((s: any) => s.pipeline_id === pipelineId && s.name === stageSpec.name);
        if (stageMatch) {
          logs.push(`  • Skipped Stage: "${stageSpec.name}" (Exists)`);
        } else {
          await fetch(`${API_BASE}/stages${auth}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...stageSpec,
              pipeline_id: pipelineId
            })
          });
          logs.push(`  • Injected Stage: "${stageSpec.name}"`);
        }
      }
    }

    // PASS 3: ACTIVITY TYPES
    if (template.activityTypes) {
      const existing = await getExisting('activityTypes');
      for (const type of template.activityTypes) {
        if (!existing.find((e: any) => e.name === type.name)) {
          await fetch(`${API_BASE}/activityTypes${auth}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(type)
          });
          logs.push(`• Injected Activity Type: '${type.name}'`);
        }
      }
    }

    // PASS 4: LOST REASONS
    if (template.lostReasons) {
      const existing = await getExisting('lostReasons');
      for (const reasonSpec of template.lostReasons) {
        if (!existing.find((e: any) => e.label === reasonSpec.reason)) {
          await fetch(`${API_BASE}/lostReasons${auth}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: reasonSpec.reason })
          });
          logs.push(`• Injected Lost Reason: '${reasonSpec.reason}'`);
        }
      }
    }

    return NextResponse.json({ success: true, logs, fieldKeyTranslationMap });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
