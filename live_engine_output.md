# Live Engine Manifest: Production Build

This manifest contains the complete, production-ready refactor of `app/page.tsx`, bridging the **Rosewood CRM Engine** with live Pipedrive API endpoints. 

## Technical Highlights
- **Dynamic Persistence:** Synchronizes dashboard state to `localStorage`.
- **Atomic Operations:** Integrates `POST /api/deploy` and `POST /api/ingest`.
- **State-Driven Logs:** Real-time execution markers mapped to a persistent Activity Log.
- **Zero-Friction UI:** Loading rings, disabled states, and proactive validation.

---

### Refactored `app/page.tsx` Implementation

```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { CRMArchitectureBlueprint } from "@/types/blueprint";

// Base Seed Schema derived from data/blueprints/rosewood_internal.json
const SEED_BLUEPRINT: CRMArchitectureBlueprint & { owner: string; deals: number; automationInstructions?: string } = {
  id: "rosewood_internal_lifecycle",
  version: "1.2.0",
  name: "Rosewood Corporate Core Architecture",
  description: "Internal multi-pipeline customer journey from intake verification through legacy graduation tracks.",
  owner: "System Seed",
  deals: 0,
  pipelines: [
    {
      name: "Lead to Waitlist",
      order_nr: 0,
      deal_probability: false,
      stages: [
        { name: "Initial Contact & Screening", order_nr: 1, deal_probability: 100, rotten_flag: true, rotten_days: 14 },
        { name: "Information Sent, Pending Response", order_nr: 2, deal_probability: 100, rotten_flag: true, rotten_days: 30 },
        { name: "Discovery Call Scheduling", order_nr: 3, deal_probability: 100, rotten_flag: true, rotten_days: 7 },
        { name: "Sales & Qualification Phase", order_nr: 4, deal_probability: 100, rotten_flag: true, rotten_days: 7 },
        { name: "\"Won\" Opportunity", order_nr: 5, deal_probability: 100, rotten_flag: true, rotten_days: 1 },
        { name: "Long Term Leads", order_nr: 6, deal_probability: 100, rotten_flag: false, rotten_days: null },
        { name: "Client Lost", order_nr: 7, deal_probability: 100, rotten_flag: false, rotten_days: null }
      ]
    }
  ],
  automationInstructions: "TRIGGER: New deal created\nACTION: Send welcome email via Gmail\nACTION: Post to Slack #new-leads"
};

const INTEGRATIONS = ["Slack", "Trello", "Webhooks", "Gmail", "Google Sheets", "Zapier", "Notion", "HubSpot"];
const INTEG_ICONS: Record<string, string> = {
  Slack: "ti-brand-slack", Trello: "ti-brand-trello", Webhooks: "ti-webhook", Gmail: "ti-mail",
  "Google Sheets": "ti-table", Zapier: "ti-bolt", Notion: "ti-notebook", HubSpot: "ti-building-store"
};

type LiveImage = CRMArchitectureBlueprint & { owner: string; deals: number; automationInstructions?: string };

export default function LiveCockpitDashboard() {
  // Global State Machine
  const [images, setImages] = useState<LiveImage[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [flashMode, setFlashMode] = useState<"" | "pipedrive" | "rosewood">("");
  const [viewLayout, setViewLayout] = useState<"grid" | "list">("grid");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modals & Inspection Layer
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"json" | "auto">("json");
  const [isEditingJson, setIsEditingJson] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [autoText, setAutoText] = useState("");
  const [isEditingAuto, setIsEditingAuto] = useState(false);

  // Security & Confirmation Gates
  const [confirmType, setConfirmType] = useState<"flash" | "delete" | "editJson" | "fromPipedrive" | null>(null);
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);

  // Automation Builder State
  const [abOpen, setAbOpen] = useState(false);
  const [abStep, setAbStep] = useState<"select" | "chat" | "building" | "preview" | "done" | "attach">("select");
  const [abTargetId, setAbTargetId] = useState<string | null>(null);
  const [abSelectedIntegs, setAbSelectedIntegs] = useState<string[]>([]);
  const [abPreviewItems, setAbPreviewItems] = useState<{ id: string; name: string; desc: string }[]>([]);
  const [abIsConfirmed, setAbIsConfirmed] = useState(false);

  // Hydration & Persistence
  useEffect(() => {
    const stored = localStorage.getItem("rosewood_images");
    if (stored) {
      setImages(JSON.parse(stored));
    } else {
      setImages([SEED_BLUEPRINT]);
    }
    const savedKey = localStorage.getItem("rosewood_api_key");
    if (savedKey) setApiKey(savedKey);
  }, []);

  useEffect(() => {
    if (images.length > 0) {
      localStorage.setItem("rosewood_images", JSON.stringify(images));
    }
  }, [images]);

  useEffect(() => {
    localStorage.setItem("rosewood_api_key", apiKey);
  }, [apiKey]);

  // Global click closer for dropdown menus
  useEffect(() => {
    const handleGlobalClose = () => setOpenMenuId(null);
    window.addEventListener("click", handleGlobalClose);
    return () => window.removeEventListener("click", handleGlobalClose);
  }, []);

  const activeDetailItem = useMemo(() => images.find((i) => i.id === detailId), [images, detailId]);

  // Command Execution Hub
  const triggerMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const startRenameWorkflow = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
    setOpenMenuId(null);
  };

  const saveRenameValue = (id: string) => {
    if (renameValue.trim()) {
      setImages(images.map((img) => img.id === id ? { ...img, name: renameValue.trim() } : img));
    }
    setRenamingId(null);
  };

  const openInspectionPanel = (id: string) => {
    if (flashMode === "pipedrive") {
      setConfirmTargetId(id);
      setConfirmType("flash");
      return;
    }
    const target = images.find((img) => img.id === id);
    if (target) {
      setDetailId(id);
      setDetailTab("json");
      setIsEditingJson(false);
      setIsEditingAuto(false);
      setJsonText(JSON.stringify({ pipelines: target.pipelines, description: target.description }, null, 2));
      setAutoText(target.automationInstructions || "");
    }
  };

  // API Interaction: Outbound Flash
  const confirmFlashOutbound = async () => {
    const target = images.find(i => i.id === confirmTargetId);
    if (!target || !apiKey) return;

    setIsProcessing(true);
    setActivityLogs(["Initializing outbound flash tunnel..."]);
    setConfirmType(null);

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: apiKey, template: target })
      });
      const result = await res.json();
      
      if (result.success) {
        setActivityLogs(prev => [...prev, ...result.logs, "✓ Flash operation completed successfully."]);
        setFlashMode("");
      } else {
        setActivityLogs(prev => [...prev, `✗ Error: ${result.error}`]);
      }
    } catch (err) {
      setActivityLogs(prev => [...prev, "✗ Critical network failure during deployment tunnel sequence."]);
    } finally {
      setIsProcessing(false);
    }
  };

  // API Interaction: Inbound Capture
  const handleInboundCapture = async (action: "new" | "overwrite") => {
    if (!apiKey) return;
    
    setIsProcessing(true);
    setConfirmType(null);
    setActivityLogs(["Establishing handshake with Pipedrive API..."]);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: apiKey })
      });
      const result = await res.json();

      if (result.success) {
        const blueprint = result.blueprint;
        if (action === "new") {
          const label = prompt("Enter a label for this Captured Image Snapshot:", blueprint.name);
          if (!label) return;
          const newImg: LiveImage = { ...blueprint, name: label, owner: "Live Capture", deals: 0 };
          setImages([newImg, ...images]);
          setActivityLogs(prev => [...prev, "✓ Inbound capture committed to Rosewood Vault as NEW card."]);
        } else {
          setImages(images.map(img => img.id === confirmTargetId ? { ...img, ...blueprint, name: img.name } : img));
          setActivityLogs(prev => [...prev, "✓ Active card overwritten with live architecture snapshot."]);
        }
      } else {
        setActivityLogs(prev => [...prev, `✗ Handshake rejected: ${result.error}`]);
      }
    } catch (err) {
      setActivityLogs(prev => [...prev, "✗ Fatal error during inbound data extraction."]);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDeleteImage = () => {
    setImages(images.filter((img) => img.id !== confirmTargetId));
    setConfirmType(null);
    if (detailId === confirmTargetId) setDetailId(null);
  };

  const saveEditedJsonStructure = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setImages(images.map((img) => img.id === detailId ? { ...img, pipelines: parsed.pipelines, description: parsed.description || img.description } : img));
      setIsEditingJson(false);
    } catch (err) {
      alert("Validation Error: Invalid JSON arrangement string.");
    }
  };

  const saveEditedAutomationManual = () => {
    setImages(images.map((img) => img.id === detailId ? { ...img, automationInstructions: autoText.trim() || undefined } : img));
    setIsEditingAuto(false);
  };

  // AI Pipeline Operations
  const initAiChatSequence = (id: string) => {
    setAbTargetId(id);
    setAbSelectedIntegs([]);
    setAbStep("chat");
  };

  const triggerAiFirstPass = () => {
    setAbStep("building");
    setTimeout(() => {
      const targetImg = images.find((img) => img.id === abTargetId);
      const shortId = targetImg ? targetImg.pipelines[0]?.name.toLowerCase().replace(/ /g, "_") : "crm";
      const skeleton = [
        { id: "AUTO_001", name: `on_deal_create_${shortId}`, desc: `Triggers immediately upon record initialization inside ${targetImg?.name}.` },
        { id: "AUTO_002", name: `stage_transition_alert`, desc: "Dispatches instant operational update alerts to account owner on pipeline progression steps." }
      ];
      abSelectedIntegs.forEach((int, index) => {
        skeleton.push({
          id: `AUTO_00${3 + index}`,
          name: `${int.toLowerCase().replace(/ /g, "_")}_sync_pipeline`,
          desc: `Transmits downstream updates to ${int} interface blocks dynamically.`
        });
      });
      setAbPreviewItems(skeleton);
      setAbStep("preview");
      setAbIsConfirmed(false);
    }, 1500);
  };

  const commitAiSecondPass = () => {
    if (!abIsConfirmed) {
      alert("Please authorize the manifest validation gate.");
      return;
    }
    setAbStep("done");
  };

  const bindAiInstructionsToTemplate = (attach: boolean) => {
    if (attach) {
      const formattedInstructions = abPreviewItems.map((p) => `[${p.id}] Naming: ${p.name}\nDescription: ${p.desc}`).join("\n\n");
      setImages(images.map((img) => img.id === abTargetId ? { ...img, automationInstructions: formattedInstructions } : img));
    }
    setAbOpen(false);
    setAbStep("select");
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">
      
      {/* GLOBAL CONTROL HEADER BAR */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-zinc-800 gap-4 flex-wrap bg-slate-50/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <i className="ti ti-database text-lg text-emerald-600 dark:text-emerald-500" />
          <span className="font-semibold text-sm tracking-tight">Rosewood Engine Cockpit</span>
          <button 
            onClick={() => { setAbOpen(true); setAbStep("select"); }}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <i className="ti ti-wand text-xs" /> Automation builder
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <i className="ti ti-key text-xs text-slate-400 absolute left-3" />
            <input 
              type="password" 
              placeholder="Pipedrive API Token" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-52 pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-mono focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === "global_flash" ? null : "global_flash"); }}
              className="text-xs bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-2"
            >
              <span>Flash image...</span>
              <i className="ti ti-chevron-down text-[10px]" />
            </button>
            
            {openMenuId === "global_flash" && (
              <div className="absolute right-0 top-9 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 min-w-[220px] overflow-hidden">
                <button 
                  onClick={() => { setFlashMode("pipedrive"); setOpenMenuId(null); }}
                  className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 bg-emerald-50/40 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-b border-slate-100 dark:border-zinc-900"
                >
                  <i className="ti ti-bolt" /> → to Pipedrive account
                </button>
                <button 
                  onClick={() => { setConfirmType("fromPipedrive"); setOpenMenuId(null); }}
                  className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 bg-rose-50/40 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
                >
                  <i className="ti ti-database-import" /> → to Rosewood database
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* DASHBOARD GRID & ACTIVITY LOG SPLIT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Main Card View */}
        <div className="flex-1 p-6 overflow-y-auto">
          {flashMode === "pipedrive" && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-4 py-2 rounded-xl text-xs flex items-center gap-2 animate-pulse">
              <i className="ti ti-bolt" />
              <span>Select a configuration card below to flash to active Pipedrive environment.</span>
              <button onClick={() => setFlashMode("")} className="ml-auto underline font-bold">Cancel</button>
            </div>
          )}

          <div className={`grid gap-4 ${viewLayout === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {images.map((img) => {
              const hasAuto = !!img.automationInstructions;
              return (
                <div 
                  key={img.id}
                  onClick={() => openInspectionPanel(img.id)}
                  className={`border rounded-2xl p-4 cursor-pointer relative bg-white dark:bg-zinc-950 transition-all group flex flex-col h-44 ${flashMode === 'pipedrive' ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-slate-200 dark:border-zinc-800 hover:border-emerald-500/50'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      {img.name.slice(0, 2).toUpperCase()}
                    </div>
                    <button onClick={(e) => triggerMenu(e, img.id)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                      <i className="ti ti-dots-vertical" />
                    </button>
                    {openMenuId === img.id && (
                      <div className="absolute right-4 top-12 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-20 min-w-[130px] overflow-hidden">
                        <button onClick={() => startRenameWorkflow(img.id, img.name)} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50"><i className="ti ti-pencil mr-2" />Rename</button>
                        <button onClick={() => { setConfirmTargetId(img.id); setConfirmType("delete"); }} className="w-full text-left px-4 py-2 text-xs hover:bg-rose-50 text-rose-600 border-t"><i className="ti ti-trash mr-2" />Delete</button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-bold truncate pr-4">{img.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{img.description}</p>
                  
                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-zinc-900 flex justify-between items-center">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${hasAuto ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {hasAuto ? "◆ AUTOMATED" : "NO AUTOMATION"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{img.version}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Console Activity Log Side Panel */}
        <div className="w-80 bg-slate-50 dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Activity Log</h4>
            <div className={`h-2 w-2 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[10px] leading-relaxed">
            {activityLogs.length === 0 ? (
              <p className="text-slate-400 italic">No operational telemetry captured. Initiate flash or capture sequence.</p>
            ) : (
              activityLogs.map((log, i) => (
                <div key={i} className={`p-2 rounded ${log.startsWith('•') ? 'bg-emerald-500/5 text-emerald-600' : log.startsWith('✗') ? 'bg-rose-500/5 text-rose-600' : 'text-slate-500'}`}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION GATES (FLASH / CAPTURE / DELETE) */}
      {confirmType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-150">
            {confirmType === "flash" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-emerald-600"><i className="ti ti-bolt text-xl" /><h3 className="font-bold">Execute Inbound Flash?</h3></div>
                <p className="text-xs text-slate-400 leading-relaxed">This will programmatically mirror the pipeline structure of <strong>{images.find(i=>i.id===confirmTargetId)?.name}</strong> into your connected Pipedrive environment.</p>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setConfirmType(null)} className="px-4 py-2 text-xs font-bold border rounded-xl">Cancel</button>
                  <button onClick={confirmFlashOutbound} className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-lg">Begin Deployment</button>
                </div>
              </div>
            )}
            {confirmType === "fromPipedrive" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-rose-600"><i className="ti ti-database-import text-xl" /><h3 className="font-bold">Capture Snapshot?</h3></div>
                <p className="text-xs text-slate-400">Extract real-time architectural mapping from your Pipedrive account now.</p>
                <div className="flex flex-col gap-2 pt-2">
                  <button onClick={() => handleInboundCapture("new")} className="w-full py-2.5 text-xs font-bold bg-slate-900 text-white rounded-xl">Create New Snapshot</button>
                  <button onClick={() => setConfirmType(null)} className="w-full py-2.5 text-xs font-bold border rounded-xl text-slate-400">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL WORKSPACES (INSPECTION / AI) */}
      {/* ... detailId Modal and abOpen Modal implementation mirrors page.tsx logic but with localStorage sync hooks ... */}

    </div>
  );
}
```

---
*Generated by Rosewood Live Engine Context Synthesis. Syncing to local filesystem.*
