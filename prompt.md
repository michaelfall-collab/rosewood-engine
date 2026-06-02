GENERAL INFORMATION:
Reference the files in docs for information regarding this project and update them as needed to ensure they match new changes.
docs/ARCHITECTURE.md
docs/CONTRIBUTING.md
docs/UI_UX_DIRECTIVE.md

After finishing the following prompt, input an abbreviated commit message into session_results.md.
Launch using the --skip-permissions flag.

CRITICAL ARCHITECTURAL GUARDRAILS:
- You are strictly forbidden from utilizing heavy-handed shell tools like 'sed' or string truncations to cut sections of the file. You must perform surgical text modifications.
- Do NOT use comments like "// implementation", "// existing code", or "// ...". Every single line of active code left in the targeted files must be printed out in full to prevent compilation failures.
- The functions handling manual automation editing (such as `updateRunbookObjectField`, `handleAddNewManualBlock`, `handleDeleteAutomationBlock`, `moveAutomationBlockUp`, `moveAutomationBlockDown`, `handleAddCadenceStep`, `handleDeleteCadenceStep`) power the Inspection Playground Deck and MUST remain completely untouched.
- Your .rwe parsing structures, type systems, and the production deploy endpoint (`app/api/deploy/route.ts`) must remain 100% active and unchanged.

==============================================================================================================================
PROMPT:
==============================================================================================================================

While flashing an image to a live connected account,  there needs to be a state manager that says "In Progress" or something and locks the user from being able to flash while the API transfer is in progress. Utilize a blurred screen and a loading icon in the middle. This should also occur while importing via API (bi-directional).