GENERAL INFORMATION:
Reference the files in docs for information regarding this project and update them as needed to ensure they match new changes.
docs/ARCHITECTURE.md
docs/CONTRIBUTING.md
docs/UI_UX_DIRECTIVE.md

After finishing the following prompt, input a summary of changes into session_results.md.
Launch using the --skip-permissions flag.

CRITICAL CODING GUARDRAILS:
- You are strictly forbidden from altering, simplifying, or truncating any business logic functions, API fetch calls, schema definitions, or LLM system prompt strings.
- Leave all functional methods exactly as they are currently written. 
- Do NOT use comments like "// implementation", "// existing code", or "// ...". Every single line of active code must be printed out in full.
- Only make changes to the visual Tailwind styling properties of the targeted elements.

==============================================================================================================================
PROMPT:
==============================================================================================================================

Verify and consider the following observations about the code changes recently implemented:
The Discrepancies in the Current Prompt Text
State Key Mismatch (wizardStep vs abStep)
The prompt asks the AI to drive full-bleed screens using a state variable named wizardStep and checks for values like 'PROJECT_SELECT' or 'GOAL_CALIBRATION'. In your live clean-slate code, your state is named abStep and uses lowercase names: 'select', 'preflight', 'chat', 'planning', 'review', 'stapling', and 'preview'. If the AI sees wizardStep, it may accidentally declare a brand-new state hook and disconnect your existing navigation handlers.

Ghost References (visibleChatHistory.map)
The prompt instructs the AI to remove a visibleChatHistory.map loop. In the clean codebase you just rolled back to, that chat history loop does not exist anymore; your modal body is already split into clean conditional blocks driven by abStep. If an AI looks for code that isn't there, it often guesses or starts aggressively deleting adjacent code blocks trying to satisfy the instruction.

Missing Layout Injection Instructions
Your current steps inside app/page.tsx are empty shells (e.g., preflight has no table, chat has no input box or "Build Logic" button). The prompt needs to explicitly tell the AI to re-inject those exact full visual structures from your backup file (oldpage.tsx) into the matching abStep conditions.


Address the following typescript errors:

[{
	"resource": "/workspaces/rosewood-engine/app/page.tsx",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type 'false | (() => Element)' is not assignable to type 'ReactNode'.\n  Type '() => JSX.Element' is not assignable to type 'ReactNode'.",
	"source": "ts",
	"startLineNumber": 1313,
	"startColumn": 7,
	"endLineNumber": 1313,
	"endColumn": 44,
	"modelVersionId": 1,
	"origin": "extHost2"
},{
	"resource": "/workspaces/rosewood-engine/app/page.tsx",
	"owner": "typescript",
	"code": "1381",
	"severity": 8,
	"message": "Unexpected token. Did you mean `{'}'}` or `&rbrace;`?",
	"source": "ts",
	"startLineNumber": 2029,
	"startColumn": 21,
	"endLineNumber": 2029,
	"endColumn": 22,
	"modelVersionId": 1,
	"origin": "extHost2"
},{
	"resource": "/workspaces/rosewood-engine/app/page.tsx",
	"owner": "typescript",
	"code": "1005",
	"severity": 8,
	"message": "')' expected.",
	"source": "ts",
	"startLineNumber": 2102,
	"startColumn": 11,
	"endLineNumber": 2102,
	"endColumn": 13,
	"modelVersionId": 1,
	"origin": "extHost2"
},{
	"resource": "/workspaces/rosewood-engine/app/page.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 2104,
	"startColumn": 8,
	"endLineNumber": 2104,
	"endColumn": 9,
	"modelVersionId": 1,
	"origin": "extHost2"
},{
	"resource": "/workspaces/rosewood-engine/app/page.tsx",
	"owner": "typescript",
	"code": "1109",
	"severity": 8,
	"message": "Expression expected.",
	"source": "ts",
	"startLineNumber": 2104,
	"startColumn": 10,
	"endLineNumber": 2104,
	"endColumn": 11,
	"modelVersionId": 1,
	"origin": "extHost2"
},{
	"resource": "/workspaces/rosewood-engine/app/page.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 2104,
	"startColumn": 11,
	"endLineNumber": 2104,
	"endColumn": 12,
	"modelVersionId": 1,
	"origin": "extHost2"
},{
	"resource": "/workspaces/rosewood-engine/app/page.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'copyFeedback'.",
	"source": "ts",
	"startLineNumber": 2107,
	"startColumn": 8,
	"endLineNumber": 2107,
	"endColumn": 20,
	"modelVersionId": 1,
	"origin": "extHost2"
},{
	"resource": "/workspaces/rosewood-engine/app/page.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'copyFeedback'.",
	"source": "ts",
	"startLineNumber": 2109,
	"startColumn": 12,
	"endLineNumber": 2109,
	"endColumn": 24,
	"modelVersionId": 1,
	"origin": "extHost2"
},{
	"resource": "/workspaces/rosewood-engine/app/page.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 2113,
	"startColumn": 5,
	"endLineNumber": 2113,
	"endColumn": 7,
	"modelVersionId": 1,
	"origin": "extHost2"
},{
	"resource": "/workspaces/rosewood-engine/app/page.tsx",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'div'.",
	"source": "ts",
	"startLineNumber": 2113,
	"startColumn": 7,
	"endLineNumber": 2113,
	"endColumn": 10,
	"modelVersionId": 1,
	"origin": "extHost2"
},{
	"resource": "/workspaces/rosewood-engine/app/page.tsx",
	"owner": "typescript",
	"code": "1109",
	"severity": 8,
	"message": "Expression expected.",
	"source": "ts",
	"startLineNumber": 2114,
	"startColumn": 3,
	"endLineNumber": 2114,
	"endColumn": 4,
	"modelVersionId": 1,
	"origin": "extHost2"
},{
	"resource": "/workspaces/rosewood-engine/app/page.tsx",
	"owner": "typescript",
	"code": "1128",
	"severity": 8,
	"message": "Declaration or statement expected.",
	"source": "ts",
	"startLineNumber": 2115,
	"startColumn": 1,
	"endLineNumber": 2115,
	"endColumn": 2,
	"modelVersionId": 1,
	"origin": "extHost2"
}]