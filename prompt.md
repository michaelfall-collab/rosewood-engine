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

We are tearing down the old, conversational chatbot Automation Builder interface to clear a clean foundation for our upcoming LEGO-style data pipeline.

### 1. Surgical State Excision inside `app/page.tsx`
- Delete only the state variables and side-effect loops directly associated with the old chatbot wizard workspace. 
- Specifically remove: `abOpen`, `wizardStep`, `abRoadmap`, `abReviewFeedback`, `staplingState`, `abSelectedImageId`, `abSelectedIntegrations`, `abChatHistory`, `visibleChatHistory`, `abChatInput`, `isAiTyping`, `abRoles`, `tempRoleLabel`, `tempRoleSeats`, `isAttached`, `isAutoFilling`, `abTelemetryGuesses`, `abQueue`, `abQueueIndex`, and `abQueueTotal`.
- Keep all other dashboard state definitions intact (such as `images`, `apiKey`, `isVerified`, `flashMode`, `viewLayout`, `detailId`, `detailTab`, `showRawJson`, `telemetryLogs`, `showTelemetry`, `expandedLogs`, etc.).

### 2. Surgical Function Excision inside `app/page.tsx`
- Remove the background methods exclusively used by the chatbot modal window.
- Specifically remove: `handleAiAutoFill`, the chat scroll `useEffect`, the telemetry guesser `useEffect`, `compileRawModelPromptManifest`, `compilePromptManifest`, the queue processing loop `useEffect`, and the `openAB` handler function.
- Do NOT touch or alter the manual runbook block editors: Leave `updateRunbookObjectField`, `handleAddNewManualBlock`, `handleDeleteAutomationBlock`, `moveAutomationBlockUp`, `moveAutomationBlockDown`, `handleAddCadenceStep`, and `handleDeleteCadenceStep` completely intact.
- Inside `handleCardClick`, delete only the line referencing `setAbCompiledObjects` and `setAbSelectedIntegrations`, keeping the execution flow that sets `detailId` active.

### 3. Surgical UI Cleanup inside `app/page.tsx`
- Inside the primary header JSX layout grid (`<header>`), remove the `<button onClick={openAB}> AUTO-BUILDER </button>` utility element block completely. Leave the import file and paste data buttons active.
- Scroll to the bottom of the JSX template wrapper. Locate the massive conditional chatbot element: `{abOpen && (() => { ... })()}`. Delete this block completely. 
- Ensure that the surrounding dashboard page envelope layout components, closing markup tags (`</main>`, `</div>`, etc.), and component parameters remain balanced and valid to preserve the primary layout shelf.

### 4. Code Cleanup inside `app/api/compile-agent/route.ts`
- Remove the plain text generation path (`mode === 'text-only'`) and conversational prose prompts configuration variables, leaving the route file optimized and ready for future structural modifications.