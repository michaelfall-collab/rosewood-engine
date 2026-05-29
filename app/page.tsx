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

interface ModalProps {
  title: string;
  message: string;
  onConfirm?: (val?: string) => void;
  onCancel: () => void;
  type: "alert" | "prompt" | "confirm";
  placeholder?: string;
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
  const [isVerified, setIsVerified] = useState(false);
  const [flashMode, setFlashMode] = useState<"" | "pipedrive" | "rosewood">("");
  const [viewLayout, setViewLayout] = useState<"grid" | "list">("grid");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"json" | "guide">("json");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [telemetryLogs, setTelemetryLogs] = useState<{ type: 'OUTBOUND' | 'INBOUND', timestamp: string, payload: any }[]>([]);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [expandedLogs, setExpandedLogs] = useState<number[]>([]);

  // Custom Modal State
  const [uiModal, setUiModal] = useState<ModalProps | null>(null);

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

  const activeDetail = useMemo(() => images.find(i => i.id === detailId), [images, detailId]);

  const verifyConnection = async () => {
    if (!apiKey || apiKey.length < 5) {
      setUiModal({
        type: "alert",
        title: "Connection Error",
        message: "Invalid API Token format. Please check your credential string.",
        onCancel: () => setUiModal(null)
      });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${apiKey}`);
      const json = await res.json();
      if (json && json.success) {
        setIsVerified(true);
        setAccountName(json.data?.company_name || json.data?.name || "Unknown");
        setCopyFeedback("Connection Verified");
        setTimeout(() => setCopyFeedback(null), 3000);
      } else {
        setIsVerified(false);
        setUiModal({
          type: "alert",
          title: "Auth Rejected",
          message: "The Pipedrive API rejected this handshake. Ensure the token is valid.",
          onCancel: () => setUiModal(null)
        });
      }
    } catch (e) {
      setIsVerified(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInboundNew = async () => {
    if (!isVerified) return verifyConnection();
    
    setUiModal({
      type: "prompt",
      title: "Capture Archive",
      message: "Enter a structural name for this Captured Image Snapshot:",
      placeholder: "New Setup Map...",
      onCancel: () => setUiModal(null),
      onConfirm: async (label) => {
        setUiModal(null);
        if (!label) return;
        setIsProcessing(true);
        try {
          const res = await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: apiKey })
          });
          const data = await res.json();
          if (data.success) {
            setImages(prev => [{ ...data.blueprint, name: label, owner: "Live Ingest", deals: 0 }, ...prev]);
            setTelemetryLogs(prev => [{ type: 'INBOUND', timestamp: new Date().toLocaleTimeString(), payload: data.blueprint }, ...prev]);
          }
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleCardClick = async (id: string) => {
    if (!flashMode) { setDetailId(id); return; }
    const target = images.find(i => i.id === id);
    if (!target) return;

    if (!isVerified) {
      setUiModal({
        type: "alert",
        title: "Matrix Locked",
        message: "You must establish a secure handshake before performing data sync operations.",
        onCancel: () => setUiModal(null)
      });
      return;
    }

    setUiModal({
      type: "confirm",
      title: flashMode === "pipedrive" ? "Flash Confirmation" : "Overwrite Confirmation",
      message: flashMode === "pipedrive" 
        ? `Are you sure you want to FLASH '${target.name}' to the live account? This will mutate production pipelines.`
        : `Are you sure you want to OVERWRITE '${target.name}' with live data? Local logic will be lost.`,
      onCancel: () => setUiModal(null),
      onConfirm: async () => {
        setUiModal(null);
        setIsProcessing(true);
        
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
              setImages(prev => prev.map(img => img.id === id ? { ...img, ...data.blueprint, name: target.name } : img));
              setTelemetryLogs(prev => [{ type: 'INBOUND', timestamp: new Date().toLocaleTimeString(), payload: data.blueprint }, ...prev]);
            } else {
              setTelemetryLogs(prev => [{ type: 'OUTBOUND', timestamp: new Date().toLocaleTimeString(), payload: target }, ...prev]);
            }
            setCopyFeedback("Sync Finished");
            setTimeout(() => setCopyFeedback(null), 3000);
            setFlashMode("");
          } else {
            setUiModal({
              type: "alert",
              title: "Operation Failed",
              message: data.error || "An unknown error occurred.",
              onCancel: () => setUiModal(null)
            });
          }
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback("✓ Copied to Clipboard");
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const deleteCard = (id: string) => {
    setUiModal({
      type: "confirm",
      title: "Prune Card",
      message: "Are you sure? This structural rewrite cannot be undone.",
      onCancel: () => setUiModal(null),
      onConfirm: () => {
        setImages(prev => prev.filter(i => i.id !== id));
        setOpenMenuId(null);
        setUiModal(null);
      }
    });
  };

  const saveRename = (id: string) => {
    if (renameValue.trim()) {
      setImages(prev => prev.map(img => img.id === id ? { ...img, name: renameValue.trim() } : img));
    }
    setRenamingId(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F1F5F9] dark:bg-[#0F172A] text-slate-800 dark:text-zinc-200 font-sans selection:bg-[#004850]/20">
      
      {/* 1. UTILITY HEADER BAR */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-slate-300 dark:border-slate-800 bg-[#FFFFFF] dark:bg-[#1E293B] sticky top-0 z-[40] transition-all">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-[#004850] rounded flex items-center justify-center">
            <i className="ti ti-database text-white text-lg" />
          </div>
          <span className="text-sm font-bold tracking-tight uppercase">Rosewood Image Manager</span>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-xl px-8">
          <div className="relative flex-1 group">
            <i className="ti ti-lock text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-[10px]" />
            <input 
              type="password"
              placeholder="API Token..."
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setIsVerified(false); }}
              disabled={isProcessing}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded py-1.5 pl-9 pr-8 text-xs font-mono focus:outline-none focus:border-[#004850] transition-all"
            />
            {apiKey && isVerified && (
              <button onClick={() => {setApiKey(""); setIsVerified(false);}} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                <i className="ti ti-x text-[10px]" />
              </button>
            )}
          </div>

          <button 
            onClick={verifyConnection}
            disabled={isVerified || isProcessing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all active:scale-95 ${
              isVerified 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 cursor-default' 
                : 'bg-[#004850] border-[#004850] text-white cursor-pointer hover:bg-[#003840]'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-sm ${isVerified ? 'bg-emerald-500 animate-pulse' : 'bg-slate-100'}`} />
            <span className="text-[10px] font-bold uppercase">
              {isVerified ? `ACTIVE // ${accountName}` : "Connect"}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Telemetry Icon */}
          <div className="relative">
            <button 
              onClick={() => setShowTelemetry(!showTelemetry)}
              disabled={isProcessing}
              className={`h-8 w-8 flex items-center justify-center rounded border transition-all active:scale-95 ${showTelemetry ? 'bg-slate-800 border-slate-700 text-emerald-400' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 hover:text-[#004850]'}`}
              title="Telemetry Terminal"
            >
              <i className="ti ti-terminal-2" />
              {telemetryLogs.length > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-sm border border-white dark:border-slate-900" />}
            </button>
            {showTelemetry && (
              <div className="absolute right-0 top-10 w-96 bg-[#F1F5F9] border-l border-slate-300 rounded overflow-hidden z-[60] flex flex-col h-[80vh] min-h-0">
                <div className="px-4 py-2 border-b border-slate-300 bg-slate-100 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Execution Telemetry // Local Stack</span>
                  <button onClick={() => setTelemetryLogs([])} className="text-[9px] font-bold uppercase text-rose-500 hover:text-rose-400">Clear</button>
                </div>
                <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 space-y-2 font-mono text-[10px]">
                  {telemetryLogs.length === 0 ? (
                    <div className="text-slate-400 italic py-8 text-center">No active data streams captured.</div>
                  ) : (
                    telemetryLogs.map((log, i) => (
                      <div key={i} className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                        <div 
                          onClick={() => setExpandedLogs(prev => prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i])}
                          className="p-2 bg-slate-100 dark:bg-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <span className={`font-bold ${log.type === 'OUTBOUND' ? 'text-emerald-600' : 'text-[#004850]'}`}>[{log.type}] {log.timestamp}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(JSON.stringify(log.payload, null, 2)); }} 
                            className="text-[#004850] hover:underline font-bold text-[9px] mr-2"
                          >
                            COPY RAW DATA
                          </button>
                        </div>
                        {expandedLogs.includes(i) && (
                          <pre className="p-2 text-slate-700 font-bold overflow-x-auto whitespace-pre-wrap bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                            {JSON.stringify(log.payload, null, 1)}
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setFlashMode("pipedrive")} className="bg-slate-700 text-white hover:bg-slate-600 rounded-sm font-bold uppercase tracking-wider text-[10px] px-3 py-1.5">Flash to Pipedrive</button>
          <div className="relative">
            <button 
              onClick={() => setOpenMenuId(openMenuId === 'vault' ? null : 'vault')}
              disabled={isProcessing}
              className="bg-[#004850] text-white hover:bg-[#003840] rounded-sm font-bold uppercase tracking-wider text-[10px] px-3 py-1.5 flex items-center gap-1"
            >
              Vault Operations <i className="ti ti-chevron-down" />
            </button>
            {openMenuId === 'vault' && (
              <div className="absolute right-0 top-9 w-40 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded overflow-hidden z-[50]">
                <button onClick={() => { handleInboundNew(); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700">Capture New Card</button>
                <button onClick={() => { setFlashMode('rosewood'); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700">Overwrite Existing</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. CONTEXTUAL BANNERS */}
      {flashMode && (
        <div className={`px-6 py-2 flex items-center justify-between border-b animate-in slide-in-from-top duration-300 ${flashMode === 'pipedrive' ? 'bg-[#334155] border-slate-700 text-white' : 'bg-[#EF4444] border-rose-700 text-white'}`}>
          <div className="flex items-center gap-3">
            <i className={`ti ${flashMode === 'pipedrive' ? 'ti-bolt' : 'ti-refresh'} text-md animate-pulse`} />
            <span className="text-[11px] font-bold uppercase tracking-tight">
              {flashMode === 'pipedrive' ? 'Select an image card below to flash to Pipedrive account framework' : 'Select an existing template card to overwrite with live data from Pipedrive'}
            </span>
          </div>
          <button onClick={() => setFlashMode("")} className="text-[10px] font-black uppercase px-2 py-1 bg-black/20 hover:bg-black/30 rounded active:scale-95">Abort</button>
        </div>
      )}

      {/* 3. MAIN GALLERY SHELF */}
      <main className="flex-1 overflow-y-auto">
        <div className="h-12 px-6 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => setViewLayout("grid")}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-2 transition-all active:scale-95 ${viewLayout === 'grid' ? 'bg-white dark:bg-slate-700 text-[#004850]' : 'text-slate-500'}`}
            >
              <i className="ti ti-layout-grid" /> Grid
            </button>
            <button 
              onClick={() => setViewLayout("list")}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-2 transition-all active:scale-95 ${viewLayout === 'list' ? 'bg-white dark:bg-slate-700 text-[#004850]' : 'text-slate-500'}`}
            >
              <i className="ti ti-list" /> List
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className={viewLayout === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-2"}>
            {(images || []).map((img) => (
              <div 
                key={img.id}
                onClick={() => handleCardClick(img.id)}
                className={`relative group border p-4 cursor-pointer transition-all duration-200 rounded active:scale-[0.98]
                  ${viewLayout === 'grid' ? 'h-44 flex flex-col justify-between' : 'flex items-center gap-6 py-2 px-4'}
                  ${flashMode === 'pipedrive' ? 'border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#004850] '}
                  ${flashMode === 'rosewood' ? 'border-rose-500 bg-rose-50/20 ring-1 ring-rose-500' : ''}
                `}
              >
                <div className="flex-1 min-w-0">
                  {renamingId === img.id ? (
                    <input 
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => saveRename(img.id)}
                      onKeyDown={(e) => e.key === 'Enter' && saveRename(img.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-slate-50 dark:bg-zinc-900 border border-[#004850] rounded px-1 font-bold outline-none text-sm"
                    />
                  ) : (
                    <h3 className="text-sm font-bold truncate tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                      {img.name}
                    </h3>
                  )}
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                    {(img.pipelines?.[0]?.stages || []).length} Stages &bull; {img.deals} Deals
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight flex items-center gap-1 ${
                    img.automationInstructions ? 'bg-emerald-100 text-emerald-700 dark:bg-[#004850]/20 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  }`}>
                    {img.automationInstructions ? "◆ automated" : "no automation"}
                  </div>
                  
                  <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === img.id ? null : img.id)}
                      className="h-7 w-7 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-colors active:scale-95"
                    >
                      <i className="ti ti-dots" />
                    </button>
                    {openMenuId === img.id && (
                      <div className="absolute right-0 bottom-8 w-32 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded z-[50] p-1 flex flex-col">
                        <button onClick={() => { setRenamingId(img.id); setRenameValue(img.name); setOpenMenuId(null); }} className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><i className="ti ti-pencil" /> Rename</button>
                        <button onClick={() => { copyToClipboard(JSON.stringify(img, null, 2)); setOpenMenuId(null); }} className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><i className="ti ti-download" /> Export</button>
                        <button onClick={() => deleteCard(img.id)} className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600 font-bold border-t border-slate-200 dark:border-slate-700 mt-1 flex items-center gap-2"><i className="ti ti-trash" /> Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 4. EXPANSIVE INSPECTION MODAL */}
      {detailId && activeDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-8 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded w-full max-w-5xl h-[90vh]  flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded bg-[#004850] flex items-center justify-center text-white">
                  <i className="ti ti-code" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight uppercase">{activeDetail.name}</h2>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{activeDetail.version}</p>
                </div>
              </div>
              <button onClick={() => setDetailId(null)} className="h-8 w-8 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center text-slate-400 active:scale-95">
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className="flex px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button 
                onClick={() => setDetailTab("json")}
                className={`px-6 py-4 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all active:scale-95 ${detailTab === 'json' ? 'border-[#004850] text-[#004850] dark:text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                API JSON Logic
              </button>
              <button 
                onClick={() => setDetailTab("guide")}
                className={`px-6 py-4 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all active:scale-95 ${detailTab === 'guide' ? 'border-[#004850] text-[#004850] dark:text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Automation Guide
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col relative p-6">
              <div className="flex justify-end mb-4">
                <button 
                  onClick={() => copyToClipboard(detailTab === 'json' ? JSON.stringify(activeDetail, null, 2) : activeDetail.automationInstructions || "")}
                  className="px-3 py-1.5 bg-[#004850] text-white rounded text-[10px] font-bold uppercase tracking-tighthover:bg-[#003840] transition-all flex items-center gap-2 active:scale-95"
                >
                  <i className="ti ti-copy" /> Copy to Clipboard
                </button>
              </div>
              <div className="flex-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto font-mono text-[11px] text-slate-700 dark:text-emerald-400/90 leading-normal">
                <pre className="whitespace-pre-wrap">{detailTab === 'json' ? JSON.stringify(activeDetail, null, 2) : activeDetail.automationInstructions || "No instructions provided."}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. CUSTOM UI MODALS (Prompt/Alert/Confirm) */}
      {uiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded w-full max-w-sm  p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <h3 className="font-bold uppercase text-xs tracking-widest text-[#004850]">{uiModal.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{uiModal.message}</p>
            {uiModal.type === "prompt" && (
              <input 
                id="modal-input"
                autoFocus
                placeholder={uiModal.placeholder}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-[#004850]"
              />
            )}
            <div className="flex justify-end gap-2 mt-2">
              {(uiModal.type === "confirm" || uiModal.type === "prompt") && (
                <button onClick={uiModal.onCancel} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-bold uppercase hover:bg-slate-50 transition-all active:scale-95">Cancel</button>
              )}
              <button 
                onClick={() => {
                  if (uiModal.type === "prompt") {
                    const val = (document.getElementById("modal-input") as HTMLInputElement).value;
                    uiModal.onConfirm?.(val);
                  } else if (uiModal.onConfirm) {
                    uiModal.onConfirm();
                  } else {
                    uiModal.onCancel();
                  }
                }}
                className="px-4 py-2 bg-[#004850] text-white rounded text-[10px] font-bold uppercase hover:bg-[#003840] transition-all active:scale-95"
              >
                {uiModal.type === "alert" ? "OK" : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. CLIPBOARD FEEDBACK */}
      {copyFeedback && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900 text-white rounded  z-[400] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 border border-slate-700">
          <i className="ti ti-check text-emerald-400 text-lg" />
          <span className="text-xs font-bold uppercase tracking-widest">{copyFeedback}</span>
        </div>
      )}

      {/* 7. PROCESSING SPINNER */}
      {isProcessing && (
        <div className="fixed inset-0 z-[500] bg-slate-900/20 backdrop-blur-[1px] flex items-center justify-center cursor-wait">
          <div className="h-10 w-10 border-4 border-[#004850]/20 border-t-[#004850] rounded-sm animate-spin " />
        </div>
      )}

    </div>
  );
}
