// app/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { CRMArchitectureBlueprint } from "@/types/blueprint";

/** 
 * PRODUCTION-GRADE TYPES
 */
type LiveImage = CRMArchitectureBlueprint & { 
  owner: string; 
  deals: number; 
  automationInstructions?: string;
  isCustom?: boolean;
};

interface DeployResponse {
  success: boolean;
  logs: string[];
  error?: string;
}

interface IngestResponse {
  success: boolean;
  blueprint: CRMArchitectureBlueprint;
  error?: string;
}

/**
 * SYSTEM SEED DATA (Used if LocalStorage is empty)
 */
const SYSTEM_SEED: LiveImage = {
  id: "rosewood_internal_lifecycle",
  version: "1.2.0",
  name: "Rosewood Corporate Core Architecture",
  description: "Internal multi-pipeline customer journey from intake verification through legacy graduation tracks.",
  owner: "System Seed",
  deals: 142,
  pipelines: [
    {
      name: "Standard Sales Pipeline",
      order_nr: 0,
      deal_probability: true,
      stages: [
        { name: "New Lead", order_nr: 1, deal_probability: 100, rotten_flag: false, rotten_days: null },
        { name: "Contacted", order_nr: 2, deal_probability: 80, rotten_flag: true, rotten_days: 7 }
      ]
    }
  ],
  automationInstructions: "TRIGGER: New deal created\nACTION: Post to Slack #ops-feed\nCONDITION: Deal value > 500"
};

export default function ClientCockpitDashboard() {
  // --- CORE STATE ENGINE ---
  const [images, setImages] = useState<LiveImage[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [flashMode, setFlashMode] = useState<"" | "pipedrive" | "rosewood">("");
  const [viewLayout, setViewLayout] = useState<"grid" | "list">("grid");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  
  // UI Interaction States
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"json" | "guide">("json");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // --- PERSISTENCE HOOKS ---
  useEffect(() => {
    const savedKey = localStorage.getItem("rw_api_token");
    const savedImages = localStorage.getItem("rw_vault_images");
    if (savedKey) setApiKey(savedKey);
    if (savedImages) {
      try { setImages(JSON.parse(savedImages)); } catch (e) { setImages([SYSTEM_SEED]); }
    } else {
      setImages([SYSTEM_SEED]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("rw_api_token", apiKey);
    if (images.length > 0) localStorage.setItem("rw_vault_images", JSON.stringify(images));
  }, [apiKey, images]);

  // --- DERIVED LOGIC ---
  const isConnected = useMemo(() => apiKey.trim().length > 5, [apiKey]);
  const activeDetail = useMemo(() => images.find(i => i.id === detailId), [images, detailId]);

  // --- NETWORK ACTIONS ---
  
  /** CHOICE A: Capture as New Card */
  const handleInboundNew = async () => {
    if (!isConnected) return alert("API Token Required");
    const label = prompt("Enter a plain-language name for this New Captured Image:");
    if (!label) return;

    setIsProcessing(true);
    setActivityLogs(p => ["Establishing handshake with Pipedrive...", ...p]);
    
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: apiKey })
      });
      const data: IngestResponse = await res.json();
      
      if (data.success) {
        const newImg: LiveImage = {
          ...data.blueprint,
          name: label,
          owner: "Live Ingest",
          deals: 0
        };
        setImages(prev => [newImg, ...prev]);
        setActivityLogs(p => ["✓ Success: Fresh architecture card committed to Rosewood Vault.", ...p]);
      } else {
        setActivityLogs(p => [`✗ Handshake rejected: ${data.error}`, ...p]);
      }
    } catch (err) {
      setActivityLogs(p => ["✗ Fatal network error during ingestion sequence.", ...p]);
    } finally {
      setIsProcessing(false);
    }
  };

  /** Outbound Flash & Inbound Overwrite Selector */
  const handleCardClick = async (id: string) => {
    if (!flashMode) {
      setDetailId(id);
      return;
    }

    const target = images.find(i => i.id === id);
    if (!target) return;

    setIsProcessing(true);

    if (flashMode === "pipedrive") {
      // OUTBOUND FLASH
      setActivityLogs(p => [`Initializing outbound flash tunnel for ${target.name}...`, ...p]);
      try {
        const res = await fetch("/api/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: apiKey, template: target })
        });
        const data: DeployResponse = await res.json();
        if (data.success) {
          setActivityLogs(p => [...data.logs, "✓ Operation Completed: System Setup flashed to Pipedrive.", ...p]);
          setFlashMode("");
        } else {
          setActivityLogs(p => [`✗ Deployment failed: ${data.error}`, ...p]);
        }
      } catch (e) {
        setActivityLogs(p => ["✗ Critical failure during deployment loop.", ...p]);
      }
    } else {
      // INBOUND OVERWRITE (rosewood mode)
      setActivityLogs(p => [`Synchronizing ${target.name} with live Pipedrive data...`, ...p]);
      try {
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: apiKey })
        });
        const data: IngestResponse = await res.json();
        if (data.success) {
          setImages(prev => prev.map(img => img.id === id ? { ...img, ...data.blueprint } : img));
          setActivityLogs(p => [`✓ Success: Card '${target.name}' updated with live snapshot.`, ...p]);
          setFlashMode("");
        } else {
          setActivityLogs(p => [`✗ Overwrite failed: ${data.error}`, ...p]);
        }
      } catch (e) {
        setActivityLogs(p => ["✗ Failure during overwrite handshake.", ...p]);
      }
    }
    setIsProcessing(false);
  };

  // --- UI UTILS ---
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback("✓ Manifest Copied to Clipboard");
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const deleteCard = (id: string) => {
    if (!confirm("Are you sure? This structural rewrite cannot be undone.")) return;
    setImages(prev => prev.filter(i => i.id !== id));
    setOpenMenuId(null);
  };

  const saveRename = (id: string) => {
    if (renameValue.trim()) {
      setImages(prev => prev.map(img => img.id === id ? { ...img, name: renameValue.trim() } : img));
    }
    setRenamingId(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] dark:bg-[#09090B] text-slate-800 dark:text-zinc-200 font-sans selection:bg-emerald-500/20">
      
      {/* 1. HEADER BAR: SECURE CONNECTION MONITOR */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-[40] transition-all">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <i className="ti ti-database text-white text-lg" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">Rosewood Engine</span>
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Image Manager v2.0</span>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-2xl px-8">
          {/* Secure Browser URL Style Input */}
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
              <i className="ti ti-lock text-sm" />
            </div>
            <input 
              type="password"
              placeholder="Pipedrive API Token (sk-pd-••••)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isProcessing}
              className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl py-2 pl-10 pr-4 text-xs font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 placeholder:tracking-normal"
            />
          </div>

          {/* Connection Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${
            isConnected 
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600' 
              : 'bg-slate-100 border-slate-200 text-slate-400'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]' : 'bg-slate-300'}`} />
            <span className="text-[10px] font-black uppercase tracking-tighter">
              {isConnected ? "Handshake Secure" : "Awaiting Key Handshake"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setOpenMenuId(openMenuId === 'global' ? null : 'global')}
              disabled={isProcessing}
              className="px-4 py-2 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-[11px] font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md"
            >
              Sync Matrix <i className="ti ti-chevron-down" />
            </button>
            {openMenuId === 'global' && (
              <div className="absolute right-0 top-11 w-60 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[50] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 flex flex-col gap-1">
                  <div className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Outbound Flash</div>
                  <button onClick={() => { setFlashMode('pipedrive'); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg flex items-center gap-2 text-emerald-600 font-medium">
                    <i className="ti ti-bolt" /> → Flash to Pipedrive
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />
                  <div className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inbound Capture</div>
                  <button onClick={() => { handleInboundNew(); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2">
                    <i className="ti ti-database-import" /> Capture as New Card
                  </button>
                  <button onClick={() => { setFlashMode('rosewood'); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg flex items-center gap-2 text-rose-600 font-medium">
                    <i className="ti ti-replace" /> Overwrite Existing Card
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. CONTEXTUAL BANNERS (STATE MACHINE) */}
      {flashMode === 'pipedrive' && (
        <div className="bg-slate-900 text-white px-6 py-2.5 flex items-center justify-between border-b border-white/10 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <i className="ti ti-alert-triangle text-amber-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-tight">Select an image card below to flash to Pipedrive account framework</span>
          </div>
          <button onClick={() => setFlashMode("")} className="text-[10px] font-black uppercase px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md">Cancel Flash</button>
        </div>
      )}

      {flashMode === 'rosewood' && (
        <div className="bg-rose-600 text-white px-6 py-2.5 flex items-center justify-between border-b border-rose-500/50 animate-in slide-in-from-top duration-300 shadow-lg z-30 relative">
          <div className="flex items-center gap-3">
            <i className="ti ti-refresh text-white animate-spin-slow" />
            <span className="text-xs font-bold uppercase tracking-tight italic">Select an existing template card to overwrite with live data from Pipedrive</span>
          </div>
          <button onClick={() => setFlashMode("")} className="text-[10px] font-black uppercase px-2 py-1 bg-black/20 hover:bg-black/30 rounded-md">Abort Ingest</button>
        </div>
      )}

      {/* 3. MAIN WORKSPACE: GALLERY SHELF + ACTIVITY LOG */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Gallery Zone */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Sub-Toolbar */}
          <div className="h-14 px-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl">
              <button 
                onClick={() => setViewLayout("grid")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-2 transition-all ${viewLayout === 'grid' ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'text-slate-400'}`}
              >
                <i className="ti ti-layout-grid" /> Grid
              </button>
              <button 
                onClick={() => setViewLayout("list")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-2 transition-all ${viewLayout === 'list' ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'text-slate-400'}`}
              >
                <i className="ti ti-list" /> List
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => alert("System File Browser Picker Active...")} className="h-8 w-8 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-center justify-center hover:bg-white dark:hover:bg-zinc-900 transition-colors text-slate-400">
                <i className="ti ti-upload" />
              </button>
              <button onClick={() => alert("Total stored architecture ledger database download started...")} className="h-8 w-8 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-center justify-center hover:bg-white dark:hover:bg-zinc-900 transition-colors text-slate-400">
                <i className="ti ti-download" />
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className={viewLayout === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
              : "flex flex-col gap-3"
            }>
              {images.map((img) => {
                const hasAuto = !!img.automationInstructions;
                const isRenaming = renamingId === img.id;
                
                return (
                  <div 
                    key={img.id}
                    onClick={() => handleCardClick(img.id)}
                    className={`
                      relative group border rounded-[2rem] p-5 cursor-pointer transition-all duration-300
                      ${viewLayout === 'grid' ? 'h-48 flex flex-col justify-between' : 'flex items-center gap-6 py-3 px-6'}
                      ${flashMode === 'pipedrive' ? 'border-emerald-500 ring-4 ring-emerald-500/10 bg-emerald-50/10 scale-[1.02]' : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-xl hover:border-emerald-500/50'}
                      ${flashMode === 'rosewood' ? 'border-rose-500 ring-4 ring-rose-500/10 bg-rose-50/10 scale-[1.02]' : ''}
                    `}
                  >
                    <div className={viewLayout === 'grid' ? "flex flex-col gap-4" : "flex items-center gap-6 flex-1"}>
                      <div className="flex-1 min-w-0">
                        {isRenaming ? (
                          <input 
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => saveRename(img.id)}
                            onKeyDown={(e) => e.key === 'Enter' && saveRename(img.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-emerald-500 rounded-xl px-2 py-0.5 font-bold outline-none"
                          />
                        ) : (
                          <h3 className="text-sm font-black tracking-tight truncate leading-tight group-hover:text-emerald-600 transition-colors">
                            {img.name}
                          </h3>
                        )}
                        <p className="text-[11px] text-slate-400 font-medium mt-1 uppercase tracking-tighter">
                          {img.pipelines[0]?.stages.length || 0} Stages &bull; {img.deals} Active Deals
                        </p>
                      </div>
                    </div>

                    <div className={viewLayout === 'grid' ? "flex items-center justify-between" : "flex items-center gap-4"}>
                      <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight flex items-center gap-1.5 ${
                        hasAuto ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                      }`}>
                        {hasAuto ? (
                          <><span className="h-1 w-1 rounded-full bg-emerald-500" /> ◆ automated</>
                        ) : (
                          "no automation"
                        )}
                      </div>
                      
                      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === img.id ? null : img.id)}
                          className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 transition-colors"
                        >
                          <i className="ti ti-dots-vertical" />
                        </button>
                        {openMenuId === img.id && (
                          <div className="absolute right-0 bottom-10 w-36 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[50]">
                            <button onClick={() => { setRenamingId(img.id); setRenameValue(img.name); setOpenMenuId(null); }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2"><i className="ti ti-pencil" /> Rename</button>
                            <button onClick={() => alert(`Exporting ${img.id}...`)} className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2"><i className="ti ti-download" /> Export</button>
                            <button onClick={() => deleteCard(img.id)} className="w-full text-left px-4 py-2.5 text-xs hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 font-bold border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2"><i className="ti ti-trash" /> Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Activity Log Side Panel */}
        <aside className="w-[320px] bg-white dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-800 flex flex-col z-[20]">
          <div className="h-14 px-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Activity Log</h4>
            <div className={`h-2 w-2 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse gap-2 font-mono text-[10px] leading-relaxed">
            {activityLogs.length === 0 ? (
              <div className="text-center mt-10 text-slate-300 italic px-8">No operational telemetry captured. Initiate flash or capture sequence.</div>
            ) : (
              activityLogs.map((log, i) => (
                <div key={i} className={`p-3 rounded-xl border transition-all ${
                  log.startsWith('✓') ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600' :
                  log.startsWith('✗') ? 'bg-rose-500/5 border-rose-500/10 text-rose-600' :
                  'bg-slate-50 dark:bg-zinc-900 border-transparent text-slate-500'
                }`}>
                  {log}
                </div>
              ))
            )}
          </div>
        </aside>
      </main>

      {/* 4. DEEP INSPECTION MODAL MATRIX */}
      {detailId && activeDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#09090B] border border-slate-200 dark:border-zinc-800 rounded-[2.5rem] w-full max-w-4xl h-[90vh] shadow-[0_0_80px_-20px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-xl">
                  <i className="ti ti-analyze text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">{activeDetail.name}</h2>
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{activeDetail.id} &bull; {activeDetail.version}</p>
                </div>
              </div>
              <button onClick={() => setDetailId(null)} className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors flex items-center justify-center">
                <i className="ti ti-x text-xl" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex px-8 border-b border-slate-100 dark:border-zinc-800">
              <button 
                onClick={() => setDetailTab("json")}
                className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${detailTab === 'json' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                API JSON Logic
              </button>
              <button 
                onClick={() => setDetailTab("guide")}
                className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${detailTab === 'guide' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Plaintext Guide Manual
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col relative">
              
              {detailTab === 'json' && (
                <div className="flex-1 flex flex-col p-8 gap-4 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Normalized Structural Blueprint</span>
                    <button 
                      onClick={() => copyToClipboard(JSON.stringify(activeDetail, null, 2))}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                      <i className="ti ti-copy" /> Copy to Clipboard
                    </button>
                  </div>
                  <div className="flex-1 rounded-3xl bg-slate-950 p-6 overflow-y-auto font-mono text-[11px] text-emerald-400/80 leading-relaxed border border-white/5 relative group">
                    <pre>{JSON.stringify(activeDetail, null, 2)}</pre>
                  </div>
                </div>
              )}

              {detailTab === 'guide' && (
                <div className="flex-1 flex flex-col p-8 gap-4 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">AI-Generated Operational Manifest</span>
                    <button 
                      onClick={() => copyToClipboard(activeDetail.automationInstructions || "")}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                      <i className="ti ti-copy" /> Copy to Clipboard
                    </button>
                  </div>
                  <div className="flex-1 rounded-3xl bg-white dark:bg-[#121214] p-8 border border-slate-100 dark:border-zinc-800 overflow-y-auto text-sm text-slate-500 dark:text-zinc-400 font-medium whitespace-pre-wrap leading-relaxed prose dark:prose-invert max-w-none">
                    {activeDetail.automationInstructions || "No automation manual linked to this architectural snapshot. Use the Automation Builder to synthesize a manifest."}
                  </div>
                </div>
              )}

              {/* Clipboard Feedback Overlay */}
              {copyFeedback && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900 text-white rounded-full text-xs font-black shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/20">
                  <i className="ti ti-check text-emerald-400 text-lg" />
                  {copyFeedback}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 5. PROCESSING SPINNER OVERLAY */}
      {isProcessing && (
        <div className="fixed inset-0 z-[200] bg-[#09090B]/40 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-300 cursor-wait">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] drop-shadow-md">Executing Command Stream...</span>
          </div>
        </div>
      )}

    </div>
  );
}
