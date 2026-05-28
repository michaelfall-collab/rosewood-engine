// app/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
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
      } else {
        alert(`Ingest Error: ${data.error}`);
      }
    } catch (err) {
      alert("Fatal network error during ingestion.");
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
      try {
        const res = await fetch("/api/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: apiKey, template: target })
        });
        const data: DeployResponse = await res.json();
        if (data.success) {
          alert("Success: Blueprint flashed to Pipedrive.");
          setFlashMode("");
        } else {
          alert(`Deployment failed: ${data.error}`);
        }
      } catch (e) {
        alert("Critical failure during deployment.");
      }
    } else {
      try {
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: apiKey })
        });
        const data: IngestResponse = await res.json();
        if (data.success) {
          setImages(prev => prev.map(img => img.id === id ? { ...img, ...data.blueprint } : img));
          setFlashMode("");
        } else {
          alert(`Overwrite failed: ${data.error}`);
        }
      } catch (e) {
        alert("Failure during overwrite handshake.");
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

  const toggleDisconnect = () => {
    if (isConnected) {
      if (confirm("Disconnect and clear API token?")) {
        setApiKey("");
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F1F5F9] dark:bg-[#0F172A] text-slate-800 dark:text-slate-200 font-sans selection:bg-[#004850]/20">
      
      {/* 1. HEADER BAR: SECURE CONNECTION MONITOR */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-slate-300 dark:border-slate-800 bg-[#FFFFFF] dark:bg-[#1E293B] sticky top-0 z-[40] transition-all">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-[#004850] rounded flex items-center justify-center shadow-md">
            <i className="ti ti-database text-white text-lg" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">Rosewood Engine</span>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-xl px-8">
          {/* Secure Browser URL Style Input */}
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 transition-colors">
              <i className="ti ti-lock text-xs" />
            </div>
            <input 
              type="password"
              placeholder="API Token..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isProcessing}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded py-1.5 pl-9 pr-4 text-xs font-mono focus:outline-none focus:border-[#004850] transition-all"
            />
          </div>

          {/* Connection Badge (Toggle Disconnect) */}
          <button 
            onClick={toggleDisconnect}
            className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all active:scale-95 ${
              isConnected 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 group' 
                : 'bg-slate-200 border-slate-300 text-slate-500 cursor-default'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 group-hover:bg-rose-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-[10px] font-bold uppercase tracking-tight">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setOpenMenuId(openMenuId === 'global' ? null : 'global')}
              disabled={isProcessing}
              className="px-4 py-2 bg-[#004850] text-white rounded text-[11px] font-bold flex items-center gap-2 hover:bg-[#003840] active:scale-95 transition-all shadow-sm"
            >
              Sync Matrix <i className="ti ti-chevron-down" />
            </button>
            {openMenuId === 'global' && (
              <div className="absolute right-0 top-11 w-60 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-xl overflow-hidden z-[50]">
                <div className="p-1 flex flex-col">
                  <button onClick={() => { setFlashMode('pipedrive'); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-emerald-600 font-bold">
                    <i className="ti ti-bolt" /> Flash to Pipedrive
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                  <button onClick={() => { handleInboundNew(); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                    <i className="ti ti-database-import" /> Capture as New Card
                  </button>
                  <button onClick={() => { setFlashMode('rosewood'); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-rose-600 font-bold">
                    <i className="ti ti-replace" /> Overwrite Existing Card
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. CONTEXTUAL BANNERS */}
      {flashMode === 'pipedrive' && (
        <div className="bg-[#334155] text-white px-6 py-2 flex items-center justify-between border-b border-slate-700 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <i className="ti ti-alert-triangle text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-tight">Select an image card below to flash to Pipedrive account framework</span>
          </div>
          <button onClick={() => setFlashMode("")} className="text-[10px] font-black uppercase px-2 py-1 bg-white/10 hover:bg-white/20 rounded">Cancel</button>
        </div>
      )}

      {flashMode === 'rosewood' && (
        <div className="bg-[#EF4444] text-white px-6 py-2 flex items-center justify-between border-b border-rose-700 animate-in slide-in-from-top duration-300 shadow-lg z-30 relative">
          <div className="flex items-center gap-3">
            <i className="ti ti-refresh text-white animate-spin-slow" />
            <span className="text-[11px] font-bold uppercase tracking-tight italic">Select an existing template card to overwrite with live data from Pipedrive</span>
          </div>
          <button onClick={() => setFlashMode("")} className="text-[10px] font-black uppercase px-2 py-1 bg-black/20 hover:bg-black/30 rounded">Abort</button>
        </div>
      )}

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 overflow-y-auto">
        
        {/* Gallery Zone */}
        <div className="flex flex-col min-w-0">
          
          {/* Sub-Toolbar */}
          <div className="h-12 px-6 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => setViewLayout("grid")}
                className={`px-3 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-2 transition-all ${viewLayout === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-[#004850]' : 'text-slate-500'}`}
              >
                <i className="ti ti-layout-grid" /> Grid
              </button>
              <button 
                onClick={() => setViewLayout("list")}
                className={`px-3 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-2 transition-all ${viewLayout === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-[#004850]' : 'text-slate-500'}`}
              >
                <i className="ti ti-list" /> List
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="p-6">
            <div className={viewLayout === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
              : "flex flex-col gap-2"
            }>
              {images.map((img) => {
                const hasAuto = !!img.automationInstructions;
                const isRenaming = renamingId === img.id;
                
                return (
                  <div 
                    key={img.id}
                    onClick={() => handleCardClick(img.id)}
                    className={`
                      relative group border p-4 cursor-pointer transition-all duration-200 rounded
                      ${viewLayout === 'grid' ? 'h-44 flex flex-col justify-between' : 'flex items-center gap-6 py-2 px-4'}
                      ${flashMode === 'pipedrive' ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-1 ring-emerald-500' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#004850] hover:shadow-sm'}
                      ${flashMode === 'rosewood' ? 'border-rose-500 bg-rose-50/20 shadow-md ring-1 ring-rose-500' : ''}
                    `}
                  >
                    <div className={viewLayout === 'grid' ? "flex flex-col gap-2" : "flex items-center gap-4 flex-1"}>
                      <div className="flex-1 min-w-0">
                        {isRenaming ? (
                          <input 
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => saveRename(img.id)}
                            onKeyDown={(e) => e.key === 'Enter' && saveRename(img.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-[#004850] rounded px-1 text-sm font-bold outline-none"
                          />
                        ) : (
                          <h3 className="text-sm font-bold truncate tracking-tight text-slate-900 dark:text-slate-100">
                            {img.name}
                          </h3>
                        )}
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                          {img.pipelines[0]?.stages.length || 0} Stages &bull; {img.deals} Deals
                        </p>
                      </div>
                    </div>

                    <div className={viewLayout === 'grid' ? "flex items-center justify-between" : "flex items-center gap-4"}>
                      <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight flex items-center gap-1 ${
                        hasAuto ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                      }`}>
                        {hasAuto ? "◆ automated" : "no automation"}
                      </div>
                      
                      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === img.id ? null : img.id)}
                          className="h-7 w-7 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-colors"
                        >
                          <i className="ti ti-dots" />
                        </button>
                        {openMenuId === img.id && (
                          <div className="absolute right-0 bottom-8 w-32 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-xl z-[50] p-1 flex flex-col">
                            <button onClick={() => { setRenamingId(img.id); setRenameValue(img.name); setOpenMenuId(null); }} className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><i className="ti ti-pencil" /> Rename</button>
                            <button onClick={() => alert(`Exporting ${img.id}...`)} className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><i className="ti ti-download" /> Export</button>
                            <button onClick={() => deleteCard(img.id)} className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600 font-bold border-t border-slate-200 dark:border-slate-700 mt-1 flex items-center gap-2"><i className="ti ti-trash" /> Delete</button>
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
      </main>

      {/* 4. DEEP INSPECTION MODAL */}
      {detailId && activeDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-8 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded bg-[#004850] flex items-center justify-center text-white">
                  <i className="ti ti-code" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">{activeDetail.name}</h2>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{activeDetail.version}</p>
                </div>
              </div>
              <button onClick={() => setDetailId(null)} className="h-8 w-8 rounded hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500">
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className="flex px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button 
                onClick={() => setDetailTab("json")}
                className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${detailTab === 'json' ? 'border-[#004850] text-[#004850] dark:text-emerald-400' : 'border-transparent text-slate-400'}`}
              >
                API JSON Logic
              </button>
              <button 
                onClick={() => setDetailTab("guide")}
                className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${detailTab === 'guide' ? 'border-[#004850] text-[#004850] dark:text-emerald-400' : 'border-transparent text-slate-400'}`}
              >
                Plaintext Guide Manual
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col relative p-6">
              
              {detailTab === 'json' && (
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Normalized Blueprint</span>
                    <button 
                      onClick={() => copyToClipboard(JSON.stringify(activeDetail, null, 2))}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#004850] text-white rounded text-[10px] font-bold uppercase tracking-tight shadow hover:bg-[#003840] transition-all"
                    >
                      <i className="ti ti-copy" /> Copy
                    </button>
                  </div>
                  <div className="flex-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 overflow-y-auto font-mono text-[11px] text-slate-700 dark:text-emerald-400/90 leading-normal">
                    <pre>{JSON.stringify(activeDetail, null, 2)}</pre>
                  </div>
                </div>
              )}

              {detailTab === 'guide' && (
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Automation Manifest</span>
                    <button 
                      onClick={() => copyToClipboard(activeDetail.automationInstructions || "")}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#004850] text-white rounded text-[10px] font-bold uppercase tracking-tight shadow hover:bg-[#003840] transition-all"
                    >
                      <i className="ti ti-copy" /> Copy
                    </button>
                  </div>
                  <div className="flex-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 overflow-y-auto text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-pre-wrap leading-relaxed">
                    {activeDetail.automationInstructions || "No instructions manual linked."}
                  </div>
                </div>
              )}

              {copyFeedback && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800 text-white rounded text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 border border-slate-700">
                  <i className="ti ti-check text-emerald-400" />
                  {copyFeedback}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 5. PROCESSING SPINNER OVERLAY */}
      {isProcessing && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center cursor-wait animate-in fade-in duration-300">
          <div className="h-10 w-10 border-4 border-[#004850]/20 border-t-[#004850] rounded-full animate-spin" />
        </div>
      )}

    </div>
  );
}
