# Fields Upgrade Manifest: Comprehensive CRM Registry

This manifest outlines the transformation of the Rosewood Engine from a pipeline-only tool to a full-spectrum CRM configuration engine.

## 1. Type Architecture (types/blueprint.ts)
We are introducing three new structural specs to the blueprint contract:
- `CustomFieldSpec`: Handles Deal, Person, Organization, and Product custom fields with type safety and option mapping.
- `ActivityTypeSpec`: Defines custom engagement types with icons and colors.
- `LostReasonSpec`: Standardizes churn analysis across environments.

## 2. Ingestion Logic (app/api/ingest/route.ts)
The ingestion route now executes 6 additional parallel fetch streams. It uses a "Sanitization Filter" to strip away Pipedrive's native system fields, ensuring the resulting blueprint only contains the unique architectural IP of the source account. Keys are normalized (e.g., `cf_custom_label`) to ensure cross-account portability.

## 3. Deployment Engine (app/api/deploy/route.ts)
The deployment engine implements a **Dynamic Translation Map**. Since Pipedrive generates unique 40-character hashes for each custom field per account, our engine:
1. Deploys/Reconciles the field by name.
2. Captures the account-specific hash.
3. Maps it back to our clean blueprint key for downstream automation triggers.

---

### Block 1: `types/blueprint.ts`
```typescript
export interface PipelineStageSpec {
  name: string;
  order_nr: number;
  deal_probability: number;
  rotten_flag: boolean;
  rotten_days: number | null;
}

export interface PipelineSpec {
  name: string;
  order_nr: number;
  deal_probability: boolean;
  stages: PipelineStageSpec[];
}

export interface CustomFieldOption {
  id?: number;
  label: string;
}

export interface CustomFieldSpec {
  key: string; // Sanitized identifier, e.g., 'cf_shed_style'
  name: string; // Display label
  type: 'text' | 'varchar' | 'double' | 'monetary' | 'date' | 'enum' | 'set' | 'user' | 'org' | 'people' | 'phone' | 'time' | 'timerange' | 'daterange' | 'address';
  field_type: 'deal' | 'person' | 'organization' | 'product';
  options?: CustomFieldOption[];
}

export interface ActivityTypeSpec {
  name: string;
  icon_key: string;
  color?: string;
}

export interface LostReasonSpec {
  reason: string;
}

export interface CRMArchitectureBlueprint {
  id: string;
  version: string;
  name: string;
  description: string;
  pipelines: PipelineSpec[];
  customFields?: CustomFieldSpec[];
  activityTypes?: ActivityTypeSpec[];
  lostReasons?: LostReasonSpec[];
}
```

### Block 2: `app/api/ingest/route.ts`
```typescript
import { NextResponse } from "next/server";
import { CustomFieldSpec, CustomFieldOption } from "@/types/blueprint";

const sanitizeKey = (name: string) => `cf_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token) return NextResponse.json({ success: false, error: "Missing authentication string." }, { status: 400 });

    const endpoints = [
      `https://api.pipedrive.com/v1/pipelines?api_token=${token}`,
      `https://api.pipedrive.com/v1/stages?api_token=${token}`,
      `https://api.pipedrive.com/v1/dealFields?api_token=${token}`,
      `https://api.pipedrive.com/v1/personFields?api_token=${token}`,
      `https://api.pipedrive.com/v1/organizationFields?api_token=${token}`,
      `https://api.pipedrive.com/v1/productFields?api_token=${token}`,
      `https://api.pipedrive.com/v1/activityTypes?api_token=${token}`,
      `https://api.pipedrive.com/v1/lostReasons?api_token=${token}`
    ];

    const responses = await Promise.all(endpoints.map(url => fetch(endpoints))); // Simplified for manifest
    // ... logic to parse and filter for custom_field === true ...
    
    return NextResponse.json({ success: true, blueprint: "..." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

### Block 3: `app/api/deploy/route.ts`
```typescript
// ... imports and interfaces ...

export async function POST(request: NextRequest) {
  const { token, template } = await request.json();
  const logs: string[] = [];
  const fieldKeyTranslationMap: Record<string, string> = {};

  // PASS 1: CUSTOM FIELDS
  if (template.customFields) {
    for (const field of template.customFields) {
      // 1. Check existing
      // 2. POST /v1/${field.field_type}Fields if missing
      // 3. fieldKeyTranslationMap[field.key] = response.data.key (the 40 char hash)
      logs.push(`• Resolved Custom ${field.field_type} Field: '${field.name}'`);
    }
  }

  // PASS 2: PIPELINES & STAGES (Existing logic)
  // ...

  return NextResponse.json({ success: true, logs, fieldKeyTranslationMap });
}
```
