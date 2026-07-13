# Rosewood Engine

The hosted home of the **Rosewood CRM Build Studio** — plan a client's Pipedrive build, then
deploy its structure straight into their account.

## Two surfaces, deliberately separate

| Path | Who | What |
|------|-----|------|
| `/` (`/picker.html`) | **Client-facing** | The plan picker — packages, quiz, builder, blueprint, report. Ported verbatim from the standalone tool; nothing internal leaks in. |
| `/studio` | **Internal only** | The cockpit: the **Deploy Room** (push pipelines + stages to Pipedrive) and the **Automation Runbook** (coming next). Not linked from the client side — reached from the picker's **Blueprint** screen via a hidden **⌘S** hatch (or by typing `/studio`). |

## How the pieces fit

- **Planning data** lives in the browser (`localStorage` key `rw-build-studio`), written by the
  picker and read by the cockpit — same origin, so they share it. Access goes through
  `lib/store.ts` so a hosted DB can replace localStorage later without touching callers.
- **The push** (`lib/pipedrive.ts`, exposed at `POST /api/deploy`) creates deal pipelines and
  their stages, idempotently by name. It runs **server-side** so the API token never sits in
  client code and there's no browser CORS. Scope is intentionally just pipelines + stages.
- **Automations are never pushed via API** — Pipedrive has no automation API. They become a
  click-by-click runbook the CRM team follows (Phase 2), generated from the picker's automation
  menu + `config/pipedriveCapabilities.json`.

## Local dev

```bash
npm install
npm run dev        # http://localhost:3000        → redirects to the picker
                   # finalize a build, then press ⌘S on the Blueprint → /studio
```

## Access model

The cockpit isn't password-locked — it's hidden by obscurity: no link from the client-facing
side, reached only via the **⌘S** hatch on the Blueprint screen (or by typing `/studio`). The
`/api/deploy` endpoint does nothing without a valid Pipedrive API token supplied at request
time, so there's no stored secret to protect. (If real auth is ever wanted, add it back as
middleware — it was removed deliberately.)

## Deploy (Vercel)

Import the repo in Vercel and deploy. The `/api/deploy` route runs as a serverless function.
No environment variables required.

## Roadmap

- **Phase 1 (done):** picker ported + Deploy Room (pipelines + stages).
- **Phase 2:** Automation Runbook generator.
- **Phase 3:** shared team persistence (DB) + real auth.
