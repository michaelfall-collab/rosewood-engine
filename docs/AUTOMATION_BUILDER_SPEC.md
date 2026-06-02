# Rosewood Engine: Improved Automation Builder Master Specification

**Document Classification:** Product Architecture, Implementation Schema & Engineering Roadmap

**Target Engine Version:** Rosewood Engine 1.1.0-RC

**Status:** Architecture Finalized – Ready for Modular Sprint Execution

---

## 1. Executive Summary & Core Objective

This master specification defines the transition away from a free-form conversational chatbot configuration model toward a deterministic, **Two-Pass Structured LEGO Assembly Pipeline**. Conversational interfaces introduce variance and lack structural reliability; this architecture treats CRM automations as an assembly of pre-defined, standardized component blocks bound tightly to physical system capability constants and custom fields.

By processing unstructured Discovery transcripts through a coordinated macro-to-micro compiler infrastructure, the engine automatically extracts human operational goals, matches them against permitted platform triggers and operators, injects live workspace data field hashes, and surfaces the final parameters in an interactive playground deck featuring direct manual inline adjustments.

---

## 2. Module Blueprint Specifications (The 4 Engineering Sections)

To maintain a clean, modular execution cycle using your CLI engine, implementation must follow these four isolated development phases sequentially:

### Section 1: Lifecycle State Architecture & Data Contracts

The foundation of the forward-engineered pipeline requires formal tracking parameters inside the proprietary envelope contract to differentiate between a prescriptive blueprint model and a production-verified reality.

* **Target File:** `types/blueprint.ts`
* **Modifications:** Update the `CRMArchitectureBlueprint` interface schema block. Add a string union attribute tracking asset lifecycle phases:
```typescript
export interface CRMArchitectureBlueprint {
  id: string;
  version: string;
  name: string;
  description: string;
  lifecycleState: 'PRESCRIPTIVE_BUILD' | 'PRODUCTION_AS_BUILT'; // Lifecycle status flag
  pipelines: PipelineSpec[];
  customFields?: CustomFieldSpec[];
  activityTypes?: ActivityTypeSpec[];
  lostReasons?: LostReasonSpec[];
  systemFieldMutations?: SystemFieldMutationSpec[];
}

```


* **The LEGO Block Schema Object:** Define a structured `PipedriveLegoAutomationBlock` to replace legacy text paragraphs with formal logic arrays:
```typescript
export interface PipedriveLegoAutomationBlock {
  automationNumber: string; // e.g., "1.1.1" or "G.0.1"
  name: string;
  description: string;
  trigger: { scope: 'deal' | 'lead' | 'activity' | 'person' | 'organization' | 'project' | 'task'; event: 'added' | 'updated' | 'deleted' };
  conditions: { field: string; operator: string; value: string }[];
  actions: { type: string; scope: string; mutations: { field_key: string; value: string }[] }[];
  governanceNotes: string;
}

```


* **Target File:** `utils/fileSerializer.ts`
* **Modifications:** Ensure both `serializeToRwe` and `deserializeFromRwe` methods capture and write `lifecycleState` seamlessly, preserving full backward-compatibility and type integrity during export/import cycles.

---

### Section 2: The Two-Pass Translation Pipeline

The background compilation engine must process unstructured inputs deterministically by routing execution through two distinct LLM steps.

* **Target File:** `app/api/compile-agent/route.ts`
* **Pass 1: Macro Ingestion & Skeleton Design:** Processes the raw transcript dump. It generates the primary track infrastructure configuration (`pipelines`, `stages`, `customFields`), and immediately extracts a clear human objective statement mapped directly onto the `targetDirective` attribute of each stage's telemetry context block.
* **Pass 2: Background Atomic Lego Assembler:** A highly structured loop that takes each extracted `targetDirective`, injects the explicit list of generated custom properties field keys (`cf_...`), references the platform grammar constraints (`config/pipedriveCapabilities.ts`), and converts the business goal into a strict `PipedriveLegoAutomationBlock` schema object.
* **Prompt Calibration (Few-Shot Injection):** Hardcode 2 or 3 pristine reference manual objects directly inside the system instruction string. This forces the model to exclusively return matching JSON blocks, completely forbidding free-form prose descriptions or hallucinated operator selectors.

---

### Section 3: The Split-View Playground Deck UI

The main user interface must replace conversational chat logging with an interactive, data-driven workspace canvas layout.

* **Target File:** `app/page.tsx`
* **Visual Geometry (NewOS Minimal Stark):** Create a dense, two-column split-view panel container layout when an account map is active:
* **Left Column (Input Workspace Canvas):** Houses a clean text-area component dedicated to receiving a raw, unstructured client discovery meeting transcript dump, alongside control parameter toggles for teams and third-party integrations.
* **Right Column (The Pillar 4 Playground Deck):** Programmatically map out the compiled list of automation blocks. Instead of raw static lines, render each block parameter (`trigger`, `conditions`, `actions`) using explicit editable text row inputs or dropdown select configurations matching your capability fields.


* **The Correction Cycle Loop:** If an automation block step requires modification, the operator makes the correction directly in the on-screen input field. The component catches the `onChange` event hook and updates the local React state memory immediately—completely bypassing chat re-prompt loops.

---

### Section 4: Production Flashing & Documentation Alignment

Your stable transport and flashing layers must be updated to cleanly process and document the structural LEGO logic blocks.

* **Target File:** `app/api/deploy/route.ts`
* **Modifications:** Ensure the deployment router can parse the updated `.rwe` layout payload package safely. It must read the `PipedriveLegoAutomationBlock` array format and map the data cleanly to execution log sequences during provisioning passes.
* **Target File:** `utils/docxExporter.ts`
* **Modifications:** Overhaul the manual page table assembly loops. Instead of reading unstructured strings, the docx engine will iterate through the structural LEGO object keys (`trigger`, `conditions`, `actions`) and render a hyper-explicit click-by-click implementation checklist for admin staff using professional teal-bordered visual grids.

---

## 3. Modular Engineering Roadmap (The Action Plan)

To implement this architecture cleanly without creating complex code merge conflicts, execute your development sprints using this section-by-section rollout protocol:

```
[ Phase 1: State Contracts ] ──► Update types/blueprint.ts & utils/fileSerializer.ts
                                              │
                                              ▼
[ Phase 2: Server-Side Agent ] ──► Overhaul app/api/compile-agent/route.ts
                                              │
                                              ▼
[ Phase 3: Interface Overhaul ] ──► Build Split Playground Deck in app/page.tsx
                                              │
                                              ▼
[ Phase 4: Output Engineering ] ──► Align utils/docxExporter.ts & verify compile

```
