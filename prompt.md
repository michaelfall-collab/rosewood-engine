GENERAL INFORMATION:
Reference the files in docs for information regarding this project and update them as needed to ensure they match new changes.
docs/ARCHITECTURE.md
docs/CONTRIBUTING.md
docs/UI_UX_DIRECTIVE.md

After finishing the following prompt, input a summary of changes into session_results.md (clearing any existing info there if it exists).
Launch using the --skip-permissions flag.

CRITICAL CODING GUARDRAILS:
- You are strictly forbidden from altering, simplifying, or truncating any business logic functions, API fetch calls, schema definitions, or LLM system prompt strings.
- Leave all functional methods exactly as they are currently written. 
- Do NOT use comments like "// implementation", "// existing code", or "// ...". Every single line of active code must be printed out in full.
- Only make changes to the visual Tailwind styling properties of the targeted elements.

==============================================================================================================================
PROMPT:
==============================================================================================================================

Address an issue with the AI API for the automation builder hitting a RPM limit after roughly 10 hits. Propose a solution where the building could continue in the background at a pace that supports the API limits and a notification that pops up when complete or perhaps a real-time estimate of Estimated Time Remaining based on the speed at which the automations are being built.