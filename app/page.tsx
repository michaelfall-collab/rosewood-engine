// app/page.tsx
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
  const [copied, setCopied] = useState(false);

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
      try {
        setImages(JSON.parse(stored));
      } catch (e) {
        setImages([SEED_BLUEPRINT]);
      }
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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

  const isConnected = apiKey.length > 5;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">
      
      {/* GLOBAL CONTROL HEADER BAR */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-zinc-800 gap-4 flex-wrap bg-slate-50/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <i className="ti ti-database text-lg text-emerald-600 dark:text-emerald-500" />
          <span className="font-semibold text-sm tracking-tight">Rosewood Engine Cockpit</span>
          <button 
            onClick={() => { setAbOpen(true); setAbStep("select"); }}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <i className="ti ti-wand text-xs" /> Automation builder
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* API Connection Module */}
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-2 py-1 shadow-sm">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight ${isConnected ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="relative flex items-center">
              <i className="ti ti-key text-xs text-slate-400 absolute left-2.5" />
              <input 
                type="password" 
                placeholder="sk-pd-••••" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-36 pl-7 pr-2 py-1 bg-transparent text-xs font-mono focus:outline-none"
              />
            </div>
            {isConnected && (
              <button 
                onClick={() => { setApiKey(""); setFlashMode(""); }}
                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                title="Disconnect & Secure"
              >
                <i className="ti ti-power text-xs" />
              </button>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === "global_flash" ? null : "global_flash"); }}
              className="text-xs bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-2 hover:opacity-90"
            >
              <span>Flash image...</span>
              <i className="ti ti-chevron-down text-[10px]" />
            </button>
            
            {openMenuId === "global_flash" && (
              <div className="absolute right-0 top-9 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 min-w-[220px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <button 
                  onClick={() => { setFlashMode("pipedrive"); setOpenMenuId(null); }}
                  className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 bg-emerald-50/40 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-b border-slate-100 dark:border-zinc-900 hover:bg-emerald-50"
                >
                  <i className="ti ti-bolt" /> → to Pipedrive account
                </button>
                <button 
                  onClick={() => { setConfirmType("fromPipedrive"); setOpenMenuId(null); }}
                  className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 bg-rose-50/40 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 hover:bg-rose-50"
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
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-4 py-2 rounded-xl text-xs flex items-center gap-2 animate-in slide-in-from-top duration-300">
              <i className="ti ti-bolt animate-pulse" />
              <span className="font-medium">Select a configuration card below to flash to active Pipedrive environment.</span>
              <button onClick={() => setFlashMode("")} className="ml-auto bg-white px-2 py-0.5 rounded border border-emerald-200 text-[10px] font-bold">Cancel Operation</button>
            </div>
          )}

          <div className={`grid gap-4 ${viewLayout === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {images.map((img) => {
              const hasAuto = !!img.automationInstructions;
              const isRenaming = renamingId === img.id;
              return (
                <div 
                  key={img.id}
                  onClick={() => openInspectionPanel(img.id)}
                  className={`border rounded-2xl p-4 cursor-pointer relative bg-white dark:bg-zinc-950 transition-all group flex flex-col h-44 select-none ${flashMode === 'pipedrive' ? 'border-emerald-500 ring-4 ring-emerald-500/5 shadow-lg scale-[1.02]' : 'border-slate-200 dark:border-zinc-800 hover:border-emerald-500/50'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      {img.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => triggerMenu(e, img.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400">
                        <i className="ti ti-dots-vertical" />
                      </button>
                      {openMenuId === img.id && (
                        <div className="absolute right-0 top-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-20 min-w-[130px] overflow-hidden">
                          <button onClick={() => startRenameWorkflow(img.id, img.name)} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"><i className="ti ti-pencil opacity-60" />Rename</button>
                          <button onClick={() => { setConfirmTargetId(img.id); setConfirmType("delete"); }} className="w-full text-left px-4 py-2 text-xs hover:bg-rose-50 text-rose-600 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2"><i className="ti ti-trash opacity-60" />Delete</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isRenaming ? (
                    <input 
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => saveRenameValue(img.id)}
                      onKeyDown={(e) => e.key === 'Enter' && saveRenameValue(img.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-bold bg-slate-50 dark:bg-zinc-900 border border-emerald-500 rounded px-1 outline-none"
                    />
                  ) : (
                    <h3 className="text-sm font-bold truncate pr-4">{img.name}</h3>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{img.description}</p>
                  
                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-zinc-900 flex justify-between items-center">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${hasAuto ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'}`}>
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
              <p className="text-slate-400 italic text-center mt-8">No operational telemetry captured.<br/>Initiate flash or capture sequence.</p>
            ) : (
              activityLogs.map((log, i) => (
                <div key={i} className={`p-2 rounded border border-transparent transition-all ${log.startsWith('•') ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10' : log.startsWith('✗') ? 'bg-rose-500/5 text-rose-600 border-rose-500/10' : 'text-slate-500 bg-white dark:bg-zinc-900 shadow-sm'}`}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* OVERLAY PANEL 1: DEEP-INSPECTION CONTROL MATRIX */}
      {detailId && activeDetailItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4 z-40 transition-all">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-150 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{activeDetailItem.name}</h2>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{activeDetailItem.id} · {activeDetailItem.owner}</p>
              </div>
              <button onClick={() => setDetailId(null)} className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-900 flex items-center justify-center text-slate-400"><i className="ti ti-x text-lg" /></button>
            </div>
            <div className="flex border-b border-slate-150 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 px-2">
              <button onClick={() => { setDetailTab("json"); setIsEditingJson(false); }} className={`px-4 py-2 text-xs font-medium border-b-2 ${detailTab === "json" ? "border-slate-900 dark:border-white text-slate-900 dark:text-white" : "border-transparent text-slate-400"}`}>API JSON</button>
              <button onClick={() => { setDetailTab("auto"); setIsEditingAuto(false); }} className={`px-4 py-2 text-xs font-medium border-b-2 ${detailTab === "auto" ? "border-slate-900 dark:border-white text-slate-900 dark:text-white" : "border-transparent text-slate-400"}`}>Automation instructions</button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              {detailTab === "json" ? (
                isEditingJson ? (
                  <div className="space-y-3">
                    <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} className="w-full h-64 font-mono text-xs p-3 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 focus:border-emerald-500 outline-none resize-none" />
                    <div className="flex justify-end gap-2"><button onClick={() => setIsEditingJson(false)} className="px-3 py-1.5 border rounded-lg text-xs font-medium">Cancel</button><button onClick={saveEditedJsonStructure} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium">Save Blueprint</button></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <pre className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 rounded-xl text-xs font-mono overflow-x-auto max-h-64 text-slate-600 dark:text-zinc-400">{jsonText}</pre>
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleCopy(jsonText)} 
                        className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
                      >
                        <i className={`ti ${copied ? 'ti-check text-emerald-500' : 'ti-copy'}`} />
                        {copied ? 'Copied' : 'Copy JSON'}
                      </button>
                      <button onClick={() => { setConfirmType("editJson"); setConfirmTargetId(activeDetailItem.id); }} className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-slate-50"><i className="ti ti-edit" /> Edit JSON Structure</button>
                    </div>
                  </div>
                )
              ) : (
                isEditingAuto ? (
                  <div className="space-y-3">
                    <textarea value={autoText} onChange={(e) => setAutoText(e.target.value)} placeholder="Paste automation setup guides..." className="w-full h-64 font-mono text-xs p-3 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 focus:border-emerald-500 outline-none" />
                    <div className="flex justify-end gap-2"><button onClick={() => setIsEditingAuto(false)} className="px-3 py-1.5 border rounded-lg text-xs font-medium">Cancel</button><button onClick={saveEditedAutomationManual} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium">Save Changes</button></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <pre className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 rounded-xl text-xs font-mono overflow-x-auto max-h-64 whitespace-pre-wrap text-slate-600 dark:text-zinc-400">{activeDetailItem.automationInstructions || "No instructions provided."}</pre>
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleCopy(activeDetailItem.automationInstructions || "")} 
                        className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
                      >
                        <i className={`ti ${copied ? 'ti-check text-emerald-500' : 'ti-copy'}`} />
                        {copied ? 'Copied' : 'Copy Instructions'}
                      </button>
                      <button onClick={() => setIsEditingAuto(true)} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium flex items-center gap-1"><i className="ti ti-edit" /> Edit inline</button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY PANEL 2: AUTOMATION DESIGN-TIME AI WORKSPACE */}
      {abOpen && (
        <div className="fixed inset-0 bg-white dark:bg-zinc-950 z-50 flex flex-col animate-in fade-in duration-200">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {abStep !== "select" && abStep !== "attach" && (
                <button onClick={() => setAbStep("select")} className="p-1 text-slate-400 hover:text-slate-600"><i className="ti ti-arrow-left text-lg" /></button>
              )}
              <i className="ti ti-wand text-emerald-500" />
              <span className="font-bold text-sm tracking-tight">AI Automation Architect Studio</span>
            </div>
            <button onClick={() => setAbOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600"><i className="ti ti-x text-lg" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {abStep === "select" && (
              <div className="max-w-xl mx-auto space-y-4">
                <h2 className="text-sm font-bold">Select Template Snapshot</h2>
                <div className="space-y-2">
                  {images.map((im) => (
                    <div key={im.id} onClick={() => initAiChatSequence(im.id)} className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 cursor-pointer flex items-center gap-4 hover:border-emerald-500 transition-all">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">{im.name.slice(0, 2)}</div>
                      <div className="flex-1"><h4 className="text-xs font-semibold">{im.name}</h4><p className="text-[11px] text-slate-400">{im.pipelines.length} pipelines</p></div>
                      <i className="ti ti-chevron-right text-slate-300" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {abStep === "chat" && (
               <div className="max-w-2xl mx-auto space-y-6">
                 <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-6 text-xs leading-relaxed">
                   Framework context mapped. Which integration nodes should we bridge to the <strong>{images.find(i=>i.id===abTargetId)?.name}</strong> blueprint?
                 </div>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                   {INTEGRATIONS.map(integ => (
                     <div 
                       key={integ} 
                       onClick={() => setAbSelectedIntegs(prev => prev.includes(integ) ? prev.filter(i => i !== integ) : [...prev, integ])}
                       className={`border rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-all ${abSelectedIntegs.includes(integ) ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300'}`}
                     >
                       <i className={`ti ${INTEG_ICONS[integ]} text-xl`} />
                       <span className="text-[10px] font-bold">{integ}</span>
                     </div>
                   ))}
                 </div>
                 <button onClick={triggerAiFirstPass} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl">Synthesize Manifest</button>
               </div>
            )}
            {abStep === "building" && (
              <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-400">
                <div className="flex gap-2"><div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" /><div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" /><div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" /></div>
                <p className="text-xs font-mono uppercase tracking-widest">Compiling Structural Logic...</p>
              </div>
            )}
            {abStep === "preview" && (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-[11px] text-emerald-700">Preview generated logic nodes. Verify naming before commitment.</div>
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800">
                  {abPreviewItems.map((item, idx) => (
                    <div key={item.id} className="p-4 bg-white dark:bg-zinc-900 flex flex-col gap-1">
                      <span className="text-[9px] font-mono font-bold text-slate-400">{item.id}</span>
                      <input value={item.name} onChange={(e) => { const next = [...abPreviewItems]; next[idx].name = e.target.value; setAbPreviewItems(next); }} className="text-xs font-bold bg-transparent outline-none" />
                      <input value={item.desc} onChange={(e) => { const next = [...abPreviewItems]; next[idx].desc = e.target.value; setAbPreviewItems(next); }} className="text-[10px] text-slate-400 bg-transparent outline-none" />
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none"><input type="checkbox" checked={abIsConfirmed} onChange={(e) => setAbIsConfirmed(e.target.checked)} className="h-4 w-4 rounded text-emerald-600" /> Authorized functional specifications</label>
                <button onClick={commitAiSecondPass} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold">Finalize Operational Manual</button>
              </div>
            )}
            {abStep === "done" && (
              <div className="max-w-md mx-auto text-center py-12 space-y-6">
                <i className="ti ti-file-check text-5xl text-emerald-500" />
                <h3 className="font-bold text-xl">Manifest Compiled</h3>
                <button onClick={() => setAbStep("attach")} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Continue to Attachment</button>
              </div>
            )}
            {abStep === "attach" && (
              <div className="max-w-xs mx-auto text-center py-12 space-y-4">
                <h3 className="font-bold text-sm">Bind to Template?</h3>
                <p className="text-xs text-slate-400">Attach these instructions to the parent template image card.</p>
                <div className="flex gap-2"><button onClick={() => bindAiInstructionsToTemplate(false)} className="flex-1 py-2 border rounded-lg text-xs">Skip</button><button onClick={() => bindAiInstructionsToTemplate(true)} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-lg">Attach</button></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION GATES (HIGH-STAKES SAFETY WARNINGS) */}
      {confirmType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border-2 border-rose-500/20 dark:border-rose-500/40 rounded-3xl p-8 w-full max-w-sm shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-150">
            {confirmType === "flash" && (
              <div className="space-y-5">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="h-16 w-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-3xl animate-pulse">
                    <i className="ti ti-alert-triangle" />
                  </div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tighter">Destructive Flash Warning</h3>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  You are about to <strong className="text-rose-600">OVERWRITE</strong> your live Pipedrive account with the structure of <strong>{images.find(i=>i.id===confirmTargetId)?.name}</strong>.
                  <br/><br/>
                  Existing pipelines and stages may be duplicated or displaced. This action creates immutable production records.
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button onClick={confirmFlashOutbound} className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-rose-600/20 transition-all active:scale-95">Yes, I understand - Flash now</button>
                  <button onClick={() => setConfirmType(null)} className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-xs transition-colors">Abort Deployment</button>
                </div>
              </div>
            )}
            {confirmType === "delete" && (
              <div className="space-y-4 text-center">
                <h3 className="font-bold text-rose-600">Clear Image Card?</h3>
                <p className="text-xs text-slate-400">Permanently delete <strong>{images.find(i=>i.id===confirmTargetId)?.name}</strong> from the Rosewood Engine database?</p>
                <div className="flex gap-2 pt-2"><button onClick={() => setConfirmType(null)} className="flex-1 py-2 border rounded-xl text-xs font-bold">Keep</button><button onClick={confirmDeleteImage} className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">Delete</button></div>
              </div>
            )}
            {confirmType === "fromPipedrive" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-emerald-600"><i className="ti ti-database-import text-xl" /><h3 className="font-bold">Capture live snapshot?</h3></div>
                <p className="text-xs text-slate-400">Extracting architectural mapping from connected environment.</p>
                <button onClick={() => handleInboundCapture("new")} className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest">Create New Card</button>
                <button onClick={() => setConfirmType(null)} className="w-full py-2 text-slate-400 text-xs font-bold">Cancel</button>
              </div>
            )}
            {confirmType === "editJson" && (
              <div className="space-y-4 text-center">
                <h3 className="font-bold text-amber-500">Modify Raw Schema?</h3>
                <p className="text-xs text-slate-400">Directly editing JSON strings can break deployment validation. Continue?</p>
                <div className="flex gap-2"><button onClick={() => setConfirmType(null)} className="flex-1 py-2 border rounded-xl text-xs">Cancel</button><button onClick={() => { setConfirmType(null); setIsEditingJson(true); }} className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold">Unlock</button></div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
