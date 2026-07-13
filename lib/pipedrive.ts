import type { PushPipeline, DeployResult } from "@/lib/types";

const API_BASE = "https://api.pipedrive.com/v1";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Push deal pipelines + their stages into a Pipedrive account.
 *
 * Deliberately minimal: pipelines and stages only (no custom fields, no rotten-days) — that
 * is the entire supported scope for v1. Idempotent by name (re-running never duplicates).
 *
 * NOTE on the old engine's bug: API-created pipelines come back with ZERO stages (the default
 * stages are a UI-only convenience). The previous code assumed placeholder stages existed and
 * tried to overwrite/prune them, which misfired. Here we simply create stages fresh.
 */
export async function deployPipelines(
  token: string,
  pipelines: PushPipeline[]
): Promise<DeployResult> {
  const logs: string[] = [];
  const created: NonNullable<DeployResult["created"]> = [];
  let ok = true;

  const url = (endpoint: string) =>
    `${API_BASE}/${endpoint}${endpoint.includes("?") ? "&" : "?"}api_token=${encodeURIComponent(token)}`;

  // Read existing pipelines once so we can reuse by name instead of duplicating.
  let existingPipelines: { id: number; name: string }[] = [];
  try {
    const res = await fetch(url("pipelines"));
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "auth or request rejected");
    existingPipelines = json.data || [];
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    logs.push(`✗ Could not reach Pipedrive (check the API token): ${msg}`);
    return { success: false, logs, created };
  }

  for (let pi = 0; pi < pipelines.length; pi++) {
    const spec = pipelines[pi];
    try {
      let pipelineId: number;
      const match = existingPipelines.find((p) => p.name === spec.name);

      if (match) {
        pipelineId = match.id;
        logs.push(`• Pipeline "${spec.name}" already exists (id ${pipelineId}) — reusing.`);
      } else {
        await sleep(120);
        const res = await fetch(url("pipelines"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: spec.name, order_nr: pi + 1 }),
        });
        const json = await res.json();
        if (!json.success || !json.data) throw new Error(json.error || "pipeline create refused");
        pipelineId = json.data.id;
        logs.push(`✓ Created pipeline "${spec.name}" (id ${pipelineId}).`);
      }

      // Existing stages in this pipeline (scoped query avoids pagination dropouts).
      await sleep(120);
      const stagesRes = await fetch(url(`stages?pipeline_id=${pipelineId}`));
      const stagesJson = await stagesRes.json();
      const existingStages: { id: number; name: string }[] = stagesJson.success ? stagesJson.data || [] : [];

      const doneStages: string[] = [];
      for (let si = 0; si < spec.stages.length; si++) {
        const stageName = spec.stages[si];
        const body = { name: stageName, pipeline_id: pipelineId, order_nr: si + 1 };
        const stageMatch = existingStages.find((s) => s.name === stageName);
        await sleep(100);

        if (stageMatch) {
          await fetch(url(`stages/${stageMatch.id}`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          logs.push(`  • Stage "${stageName}" exists — order aligned.`);
          doneStages.push(stageName);
        } else {
          const res = await fetch(url("stages"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = await res.json();
          if (json.success && json.data) {
            logs.push(`  ✓ Added stage "${stageName}".`);
            doneStages.push(stageName);
          } else {
            ok = false;
            logs.push(`  ✗ Stage "${stageName}" failed: ${json.error || "unknown"}`);
          }
        }
      }
      created.push({ pipeline: spec.name, id: pipelineId, stages: doneStages });
    } catch (e) {
      ok = false;
      const msg = e instanceof Error ? e.message : "unknown error";
      logs.push(`✗ Pipeline "${spec.name}" failed: ${msg}`);
    }
  }

  logs.push(ok ? "✓ Deploy complete." : "⚠ Deploy finished with some failures — see above.");
  return { success: ok, logs, created };
}
