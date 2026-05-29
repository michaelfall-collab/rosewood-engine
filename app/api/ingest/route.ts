// app/api/ingest/route.ts
import { NextResponse } from "next/server";
import { 
  CRMArchitectureBlueprint, 
  PipelineSpec, 
  CustomFieldSpec, 
  ActivityTypeSpec, 
  LostReasonSpec,
  SystemFieldMutationSpec
} from "@/types/blueprint";

const sanitizeKey = (name: string) => `cf_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token) return NextResponse.json({ success: false, error: "Missing authentication string." }, { status: 400 });

    const fetchStream = async (url: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        // Strict validation of Pipedrive response structure
        if (json && json.success && Array.isArray(json.data)) {
          return json.data;
        }
        return [];
      } catch (e) {
        console.error(`Ingest Error [${url}]:`, e);
        return []; 
      }
    };

    const baseURL = "https://api.pipedrive.com/v1";
    const auth = `?api_token=${token}`;

    const [
      rawPipelines,
      rawStages,
      rawDealFields,
      rawPersonFields,
      rawOrgFields,
      rawProductFields,
      rawActivityTypes,
      rawLostReasons
    ] = await Promise.all([
      fetchStream(`${baseURL}/pipelines${auth}`),
      fetchStream(`${baseURL}/stages${auth}`),
      fetchStream(`${baseURL}/dealFields${auth}`),
      fetchStream(`${baseURL}/personFields${auth}`),
      fetchStream(`${baseURL}/organizationFields${auth}`),
      fetchStream(`${baseURL}/productFields${auth}`),
      fetchStream(`${baseURL}/activityTypes${auth}`),
      fetchStream(`${baseURL}/lostReasons${auth}`)
    ]);

    // 1. Normalize Pipelines & Stages with defensive fallbacks and type guards
    const pipelines: PipelineSpec[] = (Array.isArray(rawPipelines) ? rawPipelines : []).map((p: any) => {
      if (!p || typeof p !== 'object') return null;
      return {
        name: p.name || "Unnamed Pipeline",
        order_nr: p.order_nr || 0,
        deal_probability: p.deal_probability === 1,
        stages: (Array.isArray(rawStages) ? rawStages : [])
          .filter((s: any) => s && typeof s === 'object' && s.pipeline_id === p.id && s.active_flag)
          .sort((a: any, b: any) => (a.order_nr || 0) - (b.order_nr || 0))
          .map((s: any) => ({
            name: s.name || "Unnamed Stage",
            order_nr: s.order_nr || 0,
            deal_probability: s.deal_probability || 100,
            rotten_flag: !!s.rotten_flag,
            rotten_days: s.rotten_flag ? (s.rotten_days || null) : null
          }))
      };
    }).filter((p): p is PipelineSpec => p !== null);

    // 2. Normalize Custom Fields & System Mutations with defensive fallbacks
    const fieldMap = (fields: any[], type: CustomFieldSpec['field_type']): { 
      custom: CustomFieldSpec[], 
      mutations: SystemFieldMutationSpec[] 
    } => {
      const custom: CustomFieldSpec[] = [];
      const mutations: SystemFieldMutationSpec[] = [];

      (Array.isArray(fields) ? fields : []).forEach((f: any) => {
        if (!f || typeof f !== 'object') return;
        if (f.edit_flag === true) {
          custom.push({
            key: sanitizeKey(f.name || "unnamed_field"),
            name: f.name || "Unnamed Field",
            type: f.field_type || "varchar",
            field_type: type,
            options: Array.isArray(f.options) ? f.options.map((o: any) => ({ label: o?.label || "Unnamed Option" })) : undefined
          });
        } else if (!f.custom_field && f.options && (f.key === 'label' || f.key === 'status')) {
          mutations.push({
            field_key: f.key,
            field_type: type as any,
            custom_options: Array.isArray(f.options) ? f.options.map((o: any) => ({ label: o?.label || "Unnamed Option", color: o?.color })) : []
          });
        }
      });

      return { custom, mutations };
    };

    const dealResults = fieldMap(rawDealFields, 'deal');
    const personResults = fieldMap(rawPersonFields, 'person');
    const orgResults = fieldMap(rawOrgFields, 'organization');
    const productResults = fieldMap(rawProductFields, 'product');

    const customFields: CustomFieldSpec[] = [
      ...dealResults.custom,
      ...personResults.custom,
      ...orgResults.custom,
      ...productResults.custom
    ];

    const systemFieldMutations: SystemFieldMutationSpec[] = [
      ...dealResults.mutations,
      ...personResults.mutations,
      ...orgResults.mutations
    ];

    // 3. Normalize Activity Types
    const activityTypes: ActivityTypeSpec[] = (rawActivityTypes || [])
      .filter((t: any) => t && t.active_flag)
      .map((t: any) => ({
        name: t.name || "Unnamed Activity",
        icon_key: t.icon_key || "default",
        color: t.color,
        is_custom: !!t.is_custom_flag
      }));

    // 4. Normalize Lost Reasons
    const lostReasons: LostReasonSpec[] = (rawLostReasons || [])
      .filter((r: any) => r && r.label)
      .map((r: any) => ({
        reason: r.label
      }));

    const blueprint: CRMArchitectureBlueprint = {
      id: `ingested_${Date.now()}`,
      version: "1.0.0",
      name: "Discovered CRM Architecture",
      description: `Automated ingest from account at ${new Date().toISOString()}`,
      pipelines,
      customFields,
      activityTypes,
      lostReasons,
      systemFieldMutations
    };

    return NextResponse.json({ success: true, blueprint });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
