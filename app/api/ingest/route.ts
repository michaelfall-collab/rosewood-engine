// app/api/ingest/route.ts
import { NextResponse } from "next/server";
import { 
  CRMArchitectureBlueprint, 
  PipelineSpec, 
  CustomFieldSpec, 
  ActivityTypeSpec, 
  LostReasonSpec 
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
        return json.success ? json.data : [];
      } catch (e) {
        console.error(`Ingest Error [${url}]:`, e);
        return null; 
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

    // Normalize Pipelines & Stages
    const pipelines: PipelineSpec[] = (rawPipelines || []).map((p: any) => ({
      name: p.name,
      order_nr: p.order_nr,
      deal_probability: p.deal_probability === 1,
      stages: (rawStages || [])
        .filter((s: any) => s.pipeline_id === p.id && s.active_flag)
        .sort((a: any, b: any) => a.order_nr - b.order_nr)
        .map((s: any) => ({
          name: s.name,
          order_nr: s.order_nr,
          deal_probability: s.deal_probability,
          rotten_flag: s.rotten_flag,
          rotten_days: s.rotten_flag ? s.rotten_days : null
        }))
    }));

    // Normalize Custom Fields
    const fieldMap = (fields: any[], type: CustomFieldSpec['field_type']): CustomFieldSpec[] => 
      (fields || [])
        .filter((f: any) => f.custom_field || (f.edit_flag === true && f.filterable_flag === true))
        .map((f: any) => ({
          key: sanitizeKey(f.name),
          name: f.name,
          type: f.field_type,
          field_type: type,
          options: f.options?.map((o: any) => ({ id: o.id, label: o.label }))
        }));

    const customFields: CustomFieldSpec[] = [
      ...fieldMap(rawDealFields, 'deal'),
      ...fieldMap(rawPersonFields, 'person'),
      ...fieldMap(rawOrgFields, 'organization'),
      ...fieldMap(rawProductFields, 'product')
    ];

    // Normalize Activity Types
    const activityTypes: ActivityTypeSpec[] = (rawActivityTypes || [])
      .filter((t: any) => t.active_flag)
      .map((t: any) => ({
        name: t.name,
        icon_key: t.icon_key,
        color: t.color
      }));

    // Normalize Lost Reasons
    const lostReasons: LostReasonSpec[] = (rawLostReasons || []).map((r: any) => ({
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
      lostReasons
    };

    return NextResponse.json({ success: true, blueprint });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
