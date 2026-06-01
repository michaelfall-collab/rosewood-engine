import { PIPEDRIVE_CAPABILITIES_REGISTRY } from "@/config/pipedriveCapabilities";

interface AutomationTuningConfig {
  userRoles: { roleName: string; count: number }[];
  automationBlocks?: string;
}

/**
 * SURGICAL SUB-AGENT COMPILER
 * Generates isolated Markdown sections for individual automation items.
 */
export function compileAutomationBlock(
  item: { id: string; targetStage: string; goal: string },
  roles: { roleName: string; count: number }[],
  index: number
): string {
  const roleImpact = roles.length > 0
    ? roles.map(r => `* ${r.roleName} (${r.count} seats): Direct operational beneficiary of '${item.goal}' logic.`).join("\n")
    : "* All Users: Universal process improvement.";

  return `### Automation [${index}]: ${item.targetStage}
**Operational Goal:** ${item.goal}

**Structured Role Impact Analysis:**
${roleImpact}

**Step-by-Step Native Setup Walkthrough:**
1. Go to Tools > Workflow Automations in Pipedrive.
2. Select 'Create New' and set Trigger to the event governing '${item.targetStage}'.
3. Add native filter conditions to isolate records matching the '${item.goal}' criteria.
4. Set Action 1: Create activity or update field to reflect ${item.targetStage} entry.
5. Set Action 2: Trigger external integration notification (if applicable) for the active team registry.
6. Save and Activate.`;
}

const nomenclatureGuardrails = `
CRITICAL PAIRED NOMENCLATURE RULES:
1. In Pipedrive, the overarching system object is always called an "Activity". You must NEVER use the word "task" as a general noun in your prose, goals, or descriptions.
2. If an automation assigns work to an individual, the Goal must explicitly read: "Create an Activity..." 
3. You may only use the word 'Task' when strictly specifying the internal value parameters for an activity configuration (e.g., Type: 'Task'), matching your provided toolkit options exactly.
`;

export function generateRunbookPrompt(
  blueprint: any, 
  selectedIntegrations: string[], 
  config: AutomationTuningConfig
): string {
  const integrationSection = selectedIntegrations.length > 0
    ? selectedIntegrations
        .filter(int => Object.keys(PIPEDRIVE_CAPABILITIES_REGISTRY.supportedIntegrations).includes(int))
        .map(int => `* ${int}: ${PIPEDRIVE_CAPABILITIES_REGISTRY.supportedIntegrations[int as keyof typeof PIPEDRIVE_CAPABILITIES_REGISTRY.supportedIntegrations].actions.join(", ")}`)
        .join("\n")
    : "None - All third-party integrations are strictly prohibited.";

  return `=== SYSTEM IDENTITY ===
Enterprise CRM Systems Architect for Pipedrive.

=== PIPEDRIVE NATIVE TOOLKIT ===
- Triggers: Event-Driven (Added/Updated/Deleted for Activity, Deal, Lead, Organization, Person, Project, Task) and Date-Driven (Exact Date, Before/After Date with daily offsets).
- Conditions: Instant conditions, If/Else branching logic, and Wait-for-condition states.
- Actions: Create Activity (with native Zoom/Google Meet video field toggles), Update Field, Change Stage/Pipeline, Assign Owner, Send Pipedrive Template Email, Slack (Send channel message or DM), MS Teams (Send channel alert or DM), Asana (Create task/project), Trello (Create card/list/board), Webhooks (Outbound JSON payloads), Campaigns by Pipedrive (Add to list/update subscription), and Projects by Pipedrive (Create board/milestone tasks).
- Delays: Up to 90 days per block step.

${nomenclatureGuardrails}

=== INTEGRATION CHANNELS ===
${integrationSection}

=== INGREDIENTS ===
${JSON.stringify(blueprint, null, 2)}

=== TEAM REGISTRY ===
${config.userRoles.map(r => `- Role: ${r.roleName} (Seats: ${r.count})`).join("\n")}

=== RECIPE BOOK (Business Logic Architecture) ===
1. Master Planner Phase: Establish a macro footprint index across the system, defining a clear, realistic, and achievable Trigger Event and Final End Result for each automation.
2. Sub-Agent Execution Phase: For each automation item in the footprint, logically build out the internal configurations, filling in every middle setup parameter, rule, and delay natively.
3. Structural Configuration Rules:
   - Task & Activity Chaining: Replace complex multi-month external drip campaigns with native activity dependencies (e.g., 'When the primary Touchpoint task is marked Done, natively trigger a follow-up Task with a delayed due date of 3 months').
   - Data-Driven Stage Routing: Map middleware webhooks onto native automation steps triggered when fields change (e.g., 'When custom dropdown field Qualification Status updates to Waitlist, natively move the deal to the target stage path').
   - Platform Add-on Substitutions: Replace external email marketing suites with native 'Campaigns by Pipedrive' subscription list updates on stage entry. Replace separate external software records with native 'Projects by Pipedrive' milestone boards when a deal enters the onboarding timeline track.
   - Target Directive Operationalization: If a stage has a 'targetDirective' set in its 'operational_telemetry', this is a combined business objective AND success criterion. You must begin the stage's primary automation block by explicitly mapping the directive to a concrete Pipedrive trigger+action sequence. The 'operationalGoal' field must restate this directive in execution-ready language (what fires, what changes, what gets created).
   - Global Cross-Pipeline Blocks: If an automation block has 'pipelineId' or 'stageId' set to "GLOBAL", it is not anchored to any stage. These automations fire on account-wide conditions (e.g., any deal entering any pipeline, or any lead label changing). Their automationNumber coordinate must use the "G.0.Z" format (e.g., "G.0.1"). Document them at the top of the runbook under a "GLOBAL AUTOMATIONS" header before the per-stage blocks.
   - Looping/Recurring State Machine: If a stage has 'isRecurringLoop' set to true in its 'operational_telemetry', you must implement a self-sustaining activity loop. The step-by-step configuration layout must read: 'Trigger: Activity updated where subject matches [Name] and status matches DONE. Action: Instantly create a clean follow-up Activity with an identical subject line, natively mapped relative to the trigger execution timestamp with a relative delay offset of X days.' (where X is the recurrenceDays in telemetry).
   - Multi-Branch Dropdown Router: When a 'routingDropdownKey' is specified in the operational_telemetry, you are prohibited from creating simple activity list reminders. You must construct an explicit If/Else routing tree based entirely on the target field's valid options. The step-by-step layout must read: 'Trigger: Deal custom field [Field Key] updates. Branching Conditions: If field matches Option A -> move Deal natively to Stage X. Else if field matches Option B -> move Deal natively to Stage Y.'

=== PLATED RUNBOOK OUTPUT ===
${config.automationBlocks || "No automation blocks compiled yet."}

=== PLATING GUIDE (Schema Template) ===
### Automation: [Name]
**Trigger Event:**
**Evaluative Conditions:**
**System Action:**
**Step-by-Step Configuration Steps:**
`;
}
