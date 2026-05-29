import { PIPEDRIVE_CAPABILITIES_REGISTRY } from "@/config/pipedriveCapabilities";

export function generateRunbookPrompt(blueprint: any, selectedIntegrations: string[]): string {
  const filteredIntegrations = Object.entries(PIPEDRIVE_CAPABILITIES_REGISTRY.supportedIntegrations)
    .filter(([key]) => selectedIntegrations.includes(key))
    .map(([key, value]) => `* ${key}: ${value.actions.join(", ")}`)
    .join("\n");

  return `=== SYSTEM IDENTITY ===
You are an elite Enterprise CRM Systems Architect tasked with writing a strict Administrative Automation Runbook for a Pipedrive workspace.

=== VERIFIED CAPABILITIES ===
Native Triggers:
${PIPEDRIVE_CAPABILITIES_REGISTRY.triggers.map(t => `- [${t.scope}] ${t.label} (ID: ${t.id})`).join("\n")}

Native Internal Actions:
${PIPEDRIVE_CAPABILITIES_REGISTRY.nativeInternalActions.map(a => `- ${a}`).join("\n")}

Supported Third-Party Integrations:
${filteredIntegrations || "None selected."}

=== CLIENT CRM BLUEPRINT ===
${JSON.stringify(blueprint, null, 2)}

=== OUTPUT INSTRUCTIONS ===
Analyze the pipelines, stages, and custom fields to identify operational workflow gaps. Output a Markdown-formatted runbook detailing the exact automations to build natively in Pipedrive.
Format each recommended automation using these headers:
### Automation: [Name]
**Trigger:**
**Conditions:**
**Action:**
**Step-by-Step Setup:**
`;
}
