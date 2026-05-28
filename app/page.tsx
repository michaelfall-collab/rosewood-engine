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
  const [images, setImages] = useState<LiveImage[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [flashMode, setFlashMode] = useState<"" | "pipedrive" | "rosewood">("");
  const [viewLayout, setViewLayout] = useState<"grid" | "list">("grid");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"json" | "guide">("json");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

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

  const isConnected = useMemo(() => apiKey.trim().length > 5, [apiKey]);
  const activeDetail = useMemo(() => images.find(i => i.id === detailId), [images, detailId]);

  const handleInboundNew = async () => {
    if (!isConnected) return alert("API Token Required");
    const label = prompt("Enter a name for this Captured Image:");
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
        setImages(prev => [{ ...data.blueprint, name: label, owner: "Live Ingest", deals: 0 }, ...prev]);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardClick = async (id: string) => {
    if (!flashMode) { setDetailId(id); return; }
    const target = images.find(i => i.id === id);
    if (!target) return;

    setIsProcessing(true);
    setActivityLogs([]);
    
    const endpoint = flashMode === "pipedrive" ? "/api/deploy" : "/api/ingest";
    const body = flashMode === "pipedrive" ? { token: apiKey, template: target } : { token: apiKey };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        if (flashMode === "rosewood") {
          setImages(prev => prev.map(img => img.id === id ? { ...img, ...data.blueprint } : img));
        }
        setActivityLogs(data.logs || ["Operation successful"]);
        setFlashMode("");
      } else {
        alert(`Error: ${data.error}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback("✓ Copied to Clipboard");
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F1F5F9] dark:bg-[#0F172A] text-slate-800 dark:text-zinc-200 font-sans">
      
      {/* 1. UTILITY HEADER BAR */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E293B] sticky top-0 z-[40]">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 bg-[#004850] rounded-sm flex items-center justify-center">
            <i className="ti ti-database text-white text-md" />
          </div>
          <span className="text-sm font-bold tracking-tight uppercase">Rosewood Engine</span>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-xl px-8">
          <div className="relative flex-1 group">
            <i className="ti ti-lock text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-[10px]" />
            <input 
              type="password"
              placeholder="API Token..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isProcessing}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm py-1 pl-8 pr-4 text-xs font-mono focus:outline-none focus:border-[#004850]"
            />
          </div>

          <button 
            onClick={() => isConnected && setApiKey("")}
            className={`flex items-center gap-2 px-3 py-1 rounded-sm border transition-all ${
              isConnected 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 cursor-pointer active:scale-95' 
                : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 cursor-default'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-[10px] font-bold uppercase">{isConnected ? "Connected" : "Disconnected"}</span>
          </button>
        </div>

        <div className="relative">
          <button 
            onClick={() => setOpenMenuId(openMenuId === 'global' ? null : 'global')}
            disabled={isProcessing}
            className="px-4 py-1.5 bg-[#004850] text-white rounded-sm text-[10px] font-bold uppercase tracking-wider hover:bg-[#00383e] active:scale-95 transition-all"
          >
            Sync Matrix <i className="ti ti-chevron-down ml-1" />
          </button>
          {openMenuId === 'global' && (
            <div className="absolute right-0 top-10 w-56 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm shadow-xl z-[50]">
              <div className="p-1 flex flex-col gap-0.5">
                <button onClick={() => { setFlashMode('pipedrive'); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase hover:bg-slate-50 dark:hover:bg-slate-700 text-emerald-600 flex items-center gap-2"><i className="ti ti-bolt" /> Flash to Pipedrive</button>
                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                <button onClick={() => { handleInboundNew(); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><i className="ti ti-database-import" /> Capture New</button>
                <button onClick={() => { setFlashMode('rosewood'); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase hover:bg-slate-50 dark:hover:bg-slate-700 text-rose-600 flex items-center gap-2"><i className="ti ti-replace" /> Overwrite Existing</button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 2. CONTEXTUAL BANNERS */}
      {flashMode && (
        <div className={`px-6 py-2 flex items-center justify-between border-b animate-in slide-in-from-top duration-200 ${flashMode === 'pipedrive' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-rose-700 border-rose-800 text-white'}`}>
          <div className="flex items-center gap-3">
            <i className={`ti ${flashMode === 'pipedrive' ? 'ti-bolt' : 'ti-refresh'} text-md animate-pulse`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {flashMode === 'pipedrive' ? 'Select card to Flash to Pipedrive account framework' : 'Select card to Overwrite with live Pipedrive data'}
            </span>
          </div>
          <button onClick={() => setFlashMode("")} className="text-[10px] font-black uppercase px-2 py-0.5 bg-black/20 hover:bg-black/40 rounded-sm">Abort</button>
        </div>
      )}

      {/* 3. MAIN GALLERY SHELF */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="h-10 px-6 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-[#1E293B]">
          <div className="flex items-center gap-1">
            <button onClick={() => setViewLayout("grid")} className={`px-3 py-1 rounded-sm text-[9px] font-bold uppercase tracking-widest transition-all ${viewLayout === 'grid' ? 'bg-[#004850] text-white' : 'text-slate-400 hover:text-slate-600'}`}>Grid</button>
            <button onClick={() => setViewLayout("list")} className={`px-3 py-1 rounded-sm text-[9px] font-bold uppercase tracking-widest transition-all ${viewLayout === 'list' ? 'bg-[#004850] text-white' : 'text-slate-400 hover:text-slate-600'}`}>List</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className={viewLayout === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "flex flex-col gap-1"}>
            {images.map((img) => (
              <div 
                key={img.id}
                onClick={() => handleCardClick(img.id)}
                className={`relative group border p-4 cursor-pointer transition-all rounded-sm ${
                  flashMode ? 'hover:scale-[1.01]' : 'hover:border-[#004850]'
                } ${viewLayout === 'grid' ? 'h-40 flex flex-col justify-between' : 'flex items-center gap-6 py-2 px-4'} ${
                  flashMode === 'pipedrive' ? 'border-emerald-500 bg-emerald-500/5' : flashMode === 'rosewood' ? 'border-rose-500 bg-rose-500/5' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold truncate uppercase text-slate-900 dark:text-slate-100">{img.name}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-tight">
                    {img.pipelines[0]?.stages.length || 0} Stages &bull; {img.deals} Deals
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest ${img.automationInstructions ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                    {img.automationInstructions ? "◆ Automated" : "Standard"}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(img.id); }}
                    className="h-6 w-6 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 flex items-center justify-center"
                  >
                    <i className="ti ti-dots-vertical" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 4. EXPANSIVE INSPECTION MODAL */}
      {detailId && activeDetail && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#004850]">{activeDetail.name} // System Inspector</span>
              <button onClick={() => setDetailId(null)} className="h-8 w-8 text-slate-400 hover:text-slate-600"><i className="ti ti-x text-lg" /></button>
            </div>
            
            <div className="flex px-6 border-b border-slate-200 dark:border-slate-800">
              {["json", "guide"].map(t => (
                <button key={t} onClick={() => setDetailTab(t as any)} className={`px-6 py-4 text-[10px] font-bold uppercase tracking-[0.1em] border-b-2 transition-all ${detailTab === t ? 'border-[#004850] text-[#004850]' : 'border-transparent text-slate-400'}`}>
                  {t === 'json' ? "API JSON Schema" : "Automation Guide"}
                </button>
              ))}
            </div>

            <div className="flex-1 p-6 overflow-hidden flex flex-col relative">
              <div className="flex justify-end mb-4">
                <button 
                  onClick={() => copyToClipboard(detailTab === 'json' ? JSON.stringify(activeDetail, null, 2) : activeDetail.automationInstructions || "")}
                  className="px-3 py-1 bg-[#004850] text-white rounded-sm text-[9px] font-bold uppercase tracking-widest active:scale-95 transition-all"
                >
                  <i className="ti ti-copy mr-1" /> Copy to Clipboard
                </button>
              </div>
              <div className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 overflow-y-auto rounded-sm font-mono text-[11px] leading-normal text-slate-700 dark:text-emerald-400/80">
                <pre className="whitespace-pre-wrap">{detailTab === 'json' ? JSON.stringify(activeDetail, null, 2) : activeDetail.automationInstructions || "No instructions provided."}</pre>
              </div>
              {copyFeedback && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#004850] text-white rounded-sm text-[10px] font-bold uppercase tracking-widest shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
                  {copyFeedback}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. PROCESSING OVERLAY */}
      {isProcessing && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center cursor-wait">
          <div className="h-10 w-10 border-[3px] border-[#004850]/20 border-t-[#004850] rounded-full animate-spin" />
        </div>
      )}

    </div>
  );
}
