"use client";

import { useEffect, useMemo, useState } from "react";
import { loadDeployableClients } from "@/lib/store";
import type { PickerClient, DeployResult } from "@/lib/types";
import "./studio.css";

export default function Studio() {
  const [clients, setClients] = useState<PickerClient[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DeployResult | null>(null);

  useEffect(() => {
    const list = loadDeployableClients();
    setClients(list);
    if (list.length === 1) setSelectedId(list[0].id);
    setLoaded(true);
  }, []);

  const client = useMemo(
    () => clients.find((c) => c.id === selectedId) ?? null,
    [clients, selectedId]
  );
  const pipelines = client?.pkg?.pipelines ?? [];
  const dealPipelines = pipelines.filter((p) => !p.kind);
  const skipped = pipelines.filter((p) => p.kind);

  async function deploy() {
    if (!client || !token.trim() || dealPipelines.length === 0) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          pipelines: dealPipelines.map((p) => ({ name: p.name, stages: p.stages.map((s) => s.name) })),
        }),
      });
      setResult((await res.json()) as DeployResult);
    } catch (e) {
      setResult({ success: false, logs: [`Request failed: ${e instanceof Error ? e.message : "unknown"}`] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cockpit">
      <header className="ck-head">
        <span className="ck-mark">
          Rosewood<span className="accent">.</span>
        </span>
        <span className="ck-tag">Internal Cockpit</span>
        <span className="ck-warn">Not client-facing</span>
        <a className="ck-link" href="/picker.html">← Plan picker</a>
      </header>

      <main className="ck-main">
        <h1>Deploy Room</h1>
        <p className="ck-sub">
          Push a finalized build&rsquo;s <b>pipelines &amp; stages</b> straight into a client&rsquo;s Pipedrive.
          Automations aren&rsquo;t pushed here — they&rsquo;re built from the Runbook (next).
        </p>

        {!loaded ? (
          <p className="ck-muted">Loading builds…</p>
        ) : clients.length === 0 ? (
          <div className="ck-empty">
            No client builds found in this browser. Open the{" "}
            <a href="/picker.html">plan picker</a>, select a plan for a client, then come back.
          </div>
        ) : (
          <div className="ck-grid">
            <aside className="ck-list">
              <div className="ck-list-label">Client builds</div>
              {clients.map((c) => (
                <button
                  key={c.id}
                  className={`ck-client ${selectedId === c.id ? "is-active" : ""}`}
                  onClick={() => { setSelectedId(c.id); setResult(null); }}
                >
                  <span className="nm">{c.name}</span>
                  <span className="pl">{c.pkg?.name}{c.finalized ? " · finalized" : ""}</span>
                </button>
              ))}
            </aside>

            <section className="ck-panel">
              {!client ? (
                <p className="ck-muted">Select a client build to deploy.</p>
              ) : (
                <>
                  <div className="ck-panel-head">
                    <h2>{client.name}</h2>
                    <span className="ck-chip">{client.pkg?.name}</span>
                  </div>

                  <div className="ck-section-label">Will push to Pipedrive</div>
                  {dealPipelines.length === 0 ? (
                    <p className="ck-muted">This build has no deal pipelines to push.</p>
                  ) : (
                    <ul className="ck-pipes">
                      {dealPipelines.map((p) => (
                        <li key={p.name}>
                          <b>{p.name}</b>
                          <span className="ck-stages">{p.stages.map((s) => s.name).join(" → ")}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {skipped.length > 0 && (
                    <div className="ck-skip">
                      Not pushed (separate Pipedrive objects — handled in the Runbook):{" "}
                      {skipped.map((p) => `${p.name} (${p.kind})`).join(", ")}
                    </div>
                  )}

                  <div className="ck-deploy">
                    <label className="ck-fld">
                      <span>Client&rsquo;s Pipedrive API token</span>
                      <input
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Paste API token (Settings → Personal → API in Pipedrive)"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </label>
                    <button
                      className="ck-btn"
                      disabled={busy || !token.trim() || dealPipelines.length === 0}
                      onClick={deploy}
                    >
                      {busy ? "Deploying…" : "Deploy to Pipedrive"}
                    </button>
                  </div>
                  <p className="ck-note">The token is sent to the server for this one push and never stored.</p>

                  {result && (
                    <div className={`ck-log ${result.success ? "ok" : "warn"}`}>
                      <div className="ck-log-head">{result.success ? "✓ Deployment succeeded" : "⚠ Deployment report"}</div>
                      <pre>{result.logs.join("\n")}</pre>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}

        <div className="ck-runbook-stub">
          <div className="ck-section-label">Automation Runbook</div>
          <p className="ck-muted">
            Coming next: a click-by-click build sheet for the CRM team, generated from each
            build&rsquo;s switched-on automations and Pipedrive&rsquo;s capability catalog.
          </p>
        </div>
      </main>
    </div>
  );
}
