# Rosewood Engine Operational Directive

This directive provides a high-level overview of the Rosewood CRM Engine's operational architecture. It serves as the primary technical reference for developers maintaining the core ingestion, automation, and deployment engines.

## 1. Tool Purpose
The Rosewood Engine is an enterprise-grade "Template Flashing" utility. It allows users to:
1.  **Ingest** live CRM configurations from Pipedrive into a structured JSON blueprint (`.rwe`).
2.  **Design** custom automations (runbooks) via an AI-assisted Automation Builder.
3.  **Deploy** (Flash) these configurations back into Pipedrive accounts, handling field provisioning, pipeline hydration, and system mutations.

## 2. Codebase Architecture
```text
/workspaces/rosewood-engine/
├── app/                  # Next.js App Router (SPA Cockpit & APIs)
│   ├── api/
│   │   ├── compile-agent/# AI prompt orchestration
│   │   ├── deploy/       # Pipedrive configuration flash engine
│   │   └── ingest/       # Pipedrive data ingestion & normalization
│   ├── page.tsx          # Main Cockpit UI (State management, Modals)
│   └── layout.tsx        # App wrapper
├── config/
│   └── pipedriveCapabilities.ts # API constants & schema limits
├── data/
│   └── blueprints/       # Internal architecture templates
├── docs/                 # Foundational documentation
├── types/
│   └── blueprint.ts      # Core CRMArchitectureBlueprint TypeScript definitions
└── utils/
    ├── docxExporter.ts   # Runbook-to-Docx transformation
    ├── fileSerializer.ts # Serialization/Deserialization logic (.rwe)
    └── promptCompiler.ts # AI prompt engineering for automations
```

## 3. Core Operational Workflows

### A. Ingestion Engine (`/app/api/ingest`)
The ingestion engine queries multiple Pipedrive REST endpoints in parallel. It performs active normalization, transforming raw API responses into the strongly-typed `CRMArchitectureBlueprint` structure.
- **Key Feature:** Implements recursive pagination handling to ensure data integrity for accounts exceeding standard API result sets (100+ items).

### B. Automation Builder
A client-side UI workflow orchestrated within `app/page.tsx` using local React state.
- **Goal:** To generate "Operational Telemetry" (human objectives, stuck thresholds, routing logic) for CRM stages.
- **Mechanism:** Integrates with the `compile-agent` API endpoint, which uses Gemini to translate CRM blueprints and team roles into actionable automation roadmap items based on Pipedrive API capabilities.

### C. Deployment ("Flashing") Engine (`/app/api/deploy`)
The deployment engine applies the `CRMArchitectureBlueprint` to the Pipedrive account in 5 distinct passes:
1.  **Custom Data Provisioning:** Syncs fields and field options (enums/sets).
2.  **System Field Mutations:** Re-indexes native field choices (e.g., deal labels).
3.  **Activity Types:** Injects custom business engagement actions.
4.  **Pipelines & Stages:** Hydrates the CRM structure (creates/updates pipelines and stages, prunes orphans).
5.  **Lost Reasons:** Syncs standard attrition reason options.

**Operational Safety:** All mutation passes implement paced asynchronous delays (`sleep` utility) to adhere strictly to Pipedrive plan-tier rate limits, preventing 429 API errors.

## 4. Data Serialization
- **Format:** `.rwe` (proprietary JSON envelope).
- **Serializer (`utils/fileSerializer.ts`):** Enforces schema validation and maintains backward compatibility by supporting both fully wrapped file export envelopes (`ROSEWOOD_ENGINE_PROPRIETARY_EXPORT`) and raw `CRMArchitectureBlueprint` fragments.
