// app/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { CRMArchitectureBlueprint } from "@/types/blueprint";
import { generateRunbookPrompt } from "@/utils/promptCompiler";
import { PIPEDRIVE_CAPABILITIES_REGISTRY } from "@/config/pipedriveCapabilities";
import { exportRunbookToDocx } from '@/utils/docxExporter';

/** 
 * PRODUCTION-GRADE TYPES
 */
type LiveImage = CRMArchitectureBlueprint & { 
  owner: string; 
  deals: number; 
  runbookManifest?: string;
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
  runbookManifest: "TRIGGER: New deal created\nACTION: Post to Slack #ops-feed\nCONDITION: Deal value > 500"
};

export default function ClientCockpitDashboard() {
  const [images, setImages] = useState<LiveImage[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [flashMode, setFlashMode] = useState<"" | "pipedrive" | "rosewood">("");
  const [viewLayout, setViewLayout] = useState<"grid" | "list">("grid");
  const [isProcessing, setIsProcessing] = useState(false);
  const [temporaryRollbackBackup, setTemporaryRollbackBackup] = useState<CRMArchitectureBlueprint | null>(null);
  
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

  // Automation Builder States
  const [abOpen, setAbOpen] = useState(false);
  const [abStep, setAbStep] = useState<'select' | 'chat' | 'planning' | 'stapling' | 'preview'>('select');
  const [staplingState, setStaplingState] = useState({ index: 0, total: 0, currentStage: "" });
  const [abSelectedImageId, setAbSelectedImageId] = useState<string | null>(null);
  const [abSelectedIntegrations, setAbSelectedIntegrations] = useState<string[]>([]);
  const [abChatHistory, setAbChatHistory] = useState<{ sender: "user" | "ai"; text: string; dataWidget?: any }[]>([]);
  const [abPromptViewOpen, setAbPromptViewOpen] = useState(false);
  const [abRoles, setAbRoles] = useState<{ roleName: string; count: number }[]>([]);
  const [abCompiledObjects, setAbCompiledObjects] = useState<any[]>([]);
  const [abCompiledBlocks, setAbCompiledBlocks] = useState("");
  const [tempRoleLabel, setTempRoleLabel] = useState("");
  const [tempRoleSeats, setTempRoleSeats] = useState(1);
  const [isAttached, setIsAttached] = useState(false);

  const compileRawModelPromptManifest = (compiledObjects?: any[]) => {
    const targetImage = images.find(i => i.id === abSelectedImageId);
    const sanitizedIntegrations = abSelectedIntegrations.map(i => typeof i === 'object' ? (i as any).name || JSON.stringify(i) : i);
    // Convert object array back to markdown for the prompt generator
    const markdown = (compiledObjects || abCompiledObjects).map(o => `### ${o.automationNumber}: ${o.stageName}\nGoal: ${o.operationalGoal}\nSteps: ${o.setupSteps.join(', ')}`).join('\n\n---\n\n');
    return generateRunbookPrompt(targetImage, sanitizedIntegrations, { 
      userRoles: abRoles,
      automationBlocks: markdown
    });
  };

  const compilePromptManifest = async () => {
    const targetImage = images.find(i => i.id === abSelectedImageId);
    if (!targetImage) return;

    // Transition to planning phase
    setAbStep('planning');
    setIsAttached(false);

    // Programmatically extract target items
    const automationQueue = [
      { id: "AUTO_101", targetStage: "Initial Contact & Screening", goal: "Assign owner and create screening activity" },
      { id: "AUTO_102", targetStage: "The Waitlist (Nurture Phase)", goal: "Generate physical welcome kit task and start native delayed touchpoint activity cycle" },
      { id: "AUTO_103", targetStage: "Account At-Risk", goal: "Add At Risk flag and trigger an urgent internal review meeting assignment" }
    ];

    // Automatically advance to stapling iterative loop
    setAbStep('stapling');
    setStaplingState({ index: 0, total: automationQueue.length, currentStage: "" });

    const newCompiledObjects = [];

    for (const [index, item] of automationQueue.entries()) {
      setStaplingState({ 
        index: index + 1, 
        total: automationQueue.length, 
        currentStage: item.targetStage 
      });
      
      try {
        const response = await fetch('/api/compile-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt: `You are an Enterprise CRM Systems Architect. Capabilities: ${JSON.stringify(PIPEDRIVE_CAPABILITIES_REGISTRY)}`,
            userPrompt: `Generate configuration for automation goal: "${item.goal}" in stage "${item.targetStage}". Roles involved: ${JSON.stringify(abRoles)}`
          })
        });

        const data = await response.json();
        
        if (data.success && data.jsonObject) {
          newCompiledObjects.push(data.jsonObject);
        } else {
          // Fallback if structured generation fails
          newCompiledObjects.push({
            automationNumber: index + 1,
            stageName: item.targetStage,
            operationalGoal: "Error: Generation failed.",
            impactedRoles: [],
            setupSteps: [],
            governanceNotes: data.error || "Failed."
          });
        }
      } catch (error: any) {
        console.error("Compilation failed:", error);
      }
    }

    setAbCompiledObjects(newCompiledObjects);
    const assembledPromptText = compileRawModelPromptManifest(newCompiledObjects);
    setAbCompiledBlocks(assembledPromptText);
    setTelemetryLogs(prev => [{
      type: "OUTBOUND",
      timestamp: new Date().toLocaleTimeString(),
      payload: { promptManifestAuditTrail: assembledPromptText }
    }, ...prev]);

    // Automatically transition to preview to unlock view
    setAbStep('preview');
  };

  const openAB = () => {
    setAbOpen(true);
    setAbStep('select');
    setAbSelectedImageId(null);
    setAbSelectedIntegrations([]);
    setAbChatHistory([]);
    setAbPromptViewOpen(false);
    setAbRoles([]);
    setAbCompiledBlocks("");
    setStaplingState({ index: 0, total: 0, currentStage: "" });
    setIsAttached(false);
  };

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
    
    // Clear on mount/reload as per requirements
    setApiKey("");
    setIsVerified(false);
    setTemporaryRollbackBackup(null);
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

        if (flashMode === "pipedrive") {
          try {
            const res = await fetch("/api/ingest", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: apiKey })
            });
            const data = await res.json();
            if (data.success) {
              setTemporaryRollbackBackup(data.blueprint);
            }
          } catch (e) {
            console.error("Failed to capture rollback snapshot:", e);
          }
        }

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
    setCopyFeedback("◆ Payload copied to clipboard");
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleDocxDownload = async () => {
    if (!abCompiledObjects || abCompiledObjects.length === 0) return;
    
    // 1. Compile the text formatting straight into a binary file stream in memory
    const targetImage = images.find(i => i.id === abSelectedImageId);
    const fileBlob = await exportRunbookToDocx(abCompiledObjects, targetImage?.name || "Backup Workspace");
    
    // 2. Trigger browser event mechanism to catch data streams and download file automatically
    const downloadUrl = URL.createObjectURL(fileBlob);
    const anchorElement = document.createElement('a');
    anchorElement.href = downloadUrl;
    anchorElement.download = `pipedrive-runbook-${abSelectedImageId || 'export'}.docx`;
    
    document.body.appendChild(anchorElement);
    anchorElement.click();
    
    // 3. Clean up reference blocks instantly to avoid browser memory leaks
    document.body.removeChild(anchorElement);
    URL.revokeObjectURL(downloadUrl);
    setCopyFeedback("◆ Runbook Downloaded (.docx)");
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

  const handleRestore = async () => {
    if (!temporaryRollbackBackup) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: apiKey, template: temporaryRollbackBackup })
      });
      const data = await res.json();
      if (data.success) {
        setTelemetryLogs(prev => [{ type: 'OUTBOUND', timestamp: new Date().toLocaleTimeString(), payload: temporaryRollbackBackup }, ...prev]);
        setCopyFeedback("Rollback Successful");
        setTemporaryRollbackBackup(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handlePromote = () => {
    if (!temporaryRollbackBackup) return;
    setUiModal({
      type: "prompt",
      title: "Promote Snapshot",
      message: "Enter an archive title for this snapshot:",
      placeholder: "New Archived Name...",
      onCancel: () => setUiModal(null),
      onConfirm: async (label) => {
        setUiModal(null);
        if (!label) return;
        setImages(prev => [{ ...temporaryRollbackBackup, name: label, owner: "Recovery Snapshot", deals: 0 }, ...prev]);
        setTemporaryRollbackBackup(null);
      }
    });
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
          <button
            onClick={openAB}
            className="text-[10px] font-bold uppercase tracking-wider text-[#004850] dark:text-zinc-300 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 rounded-sm flex items-center gap-1 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
          >
            <i className="ti ti-wand" /> ▲ AUTOMATION RUNBOOK BUILDER
          </button>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-xl px-8">
          <div className="relative flex-1 group">
            <i className="ti ti-lock text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-[10px]" />
            <input 
              type="password"
              placeholder="API Token..."
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setIsVerified(false); setTemporaryRollbackBackup(null); }}
              disabled={isProcessing}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded py-1.5 pl-9 pr-8 text-xs font-mono focus:outline-none focus:border-[#004850] transition-all"
            />
            {apiKey && isVerified && (
              <button onClick={() => {setApiKey(""); setIsVerified(false); setTemporaryRollbackBackup(null);}} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
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
          {/* Telemetry Icon & Rescue Dropdown */}
          <div className="flex items-center gap-2">
            {temporaryRollbackBackup && (
              <div className="relative">
                <button 
                  onClick={() => setOpenMenuId(openMenuId === 'rescue' ? null : 'rescue')}
                  className="bg-amber-500 border border-amber-600 text-white font-black px-2 py-1.5 text-[9px] uppercase tracking-wider rounded-sm flex items-center gap-1 hover:bg-amber-600 cursor-pointer animate-in fade-in zoom-in duration-200"
                >
                  <i className="ti ti-shield-alert" /> Temp Image <i className="ti ti-chevron-down" />
                </button>
                {openMenuId === 'rescue' && (
                  <div className="absolute right-0 top-9 w-48 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded overflow-hidden z-[50] shadow-xl">
                    <button onClick={() => { handleRestore(); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-emerald-600">Restore</button>
                    <button onClick={() => { handlePromote(); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 font-bold border-t border-slate-200 dark:border-slate-700">Promote to Database</button>
                  </div>
                )}
              </div>
            )}
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
                  <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-2 font-mono text-[10px]">
                    {telemetryLogs.length === 0 ? (
                      <div className="text-slate-400 italic py-8 text-center">No active data streams captured.</div>
                    ) : (
                      telemetryLogs.map((log, i) => (
                        <div key={i} className="border border-slate-200 dark:border-slate-700 rounded">
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
          </div>

          <button onClick={() => setFlashMode("pipedrive")} className="bg-[#10B981] text-white hover:bg-[#059669] rounded-sm font-bold uppercase tracking-wider text-[10px] px-3 py-1.5 shadow-sm transition-all">Flash to Pipedrive</button>
          <div className="relative">
            <button 
              onClick={() => setOpenMenuId(openMenuId === 'vault' ? null : 'vault')}
              disabled={isProcessing}
              className="bg-blue-700 text-white hover:bg-blue-800 rounded-sm font-bold uppercase tracking-wider text-[10px] px-3 py-1.5 flex items-center gap-1 shadow-sm transition-all"
            >
              Flash to Image Manager <i className="ti ti-chevron-down" />
            </button>
            {openMenuId === 'vault' && (
              <div className="absolute right-0 top-9 w-48 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded overflow-hidden z-[50] shadow-xl">
                <button onClick={() => { handleInboundNew(); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 font-bold">Capture New Card</button>
                <button onClick={() => { setFlashMode('rosewood'); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 font-bold">Overwrite Existing</button>
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
                    img.runbookManifest ? 'bg-emerald-100 text-emerald-700 dark:bg-[#004850]/20 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  }`}>
                    {img.runbookManifest ? "◆ automated" : "no automation"}
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
                  onClick={() => copyToClipboard(detailTab === 'json' ? JSON.stringify(activeDetail, null, 2) : activeDetail.runbookManifest || "")}
                  className="px-3 py-1.5 bg-[#004850] text-white rounded text-[10px] font-bold uppercase tracking-tighthover:bg-[#003840] transition-all flex items-center gap-2 active:scale-95"
                >
                  <i className="ti ti-copy" /> Copy to Clipboard
                </button>
              </div>
              <div className="flex-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto font-mono text-[11px] text-slate-700 dark:text-emerald-400/90 leading-normal">
                <pre className="whitespace-pre-wrap">{detailTab === 'json' ? JSON.stringify(activeDetail, null, 2) : activeDetail.runbookManifest || "No instructions provided."}</pre>
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

      {/* AUTOMATION BUILDER MODAL */}
      {abOpen && (
        <div className="fixed inset-0 w-full h-full min-h-screen z-[250] flex flex-col bg-slate-50/95 dark:bg-zinc-950/95 backdrop-blur-2xl">
          {/* Header */}
          <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-800/80">
            <span className="text-xs font-bold uppercase tracking-tight">▲ AUTOMATION RUNBOOK BUILDER</span>
            <button
              onClick={() => {
                setAbOpen(false);
                setAbStep('select');
                setAbSelectedImageId(null);
                setAbSelectedIntegrations([]);
                setAbChatHistory([]);
                setAbRoles([]);
              }}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <i className="ti ti-x" />
            </button>
          </div>

          {/* Unified Chat Timeline Stream */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto w-full space-y-6">
                {/* History Messages */}
                {abChatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender === 'ai' ? (
                      <div className="bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 p-4 rounded-2xl rounded-tl-none max-w-[85%] flex gap-3 text-xs leading-relaxed font-sans shadow-sm border border-zinc-700/50">
                        <span className="font-bold text-lg text-emerald-500">◆</span>
                        <div>{msg.text}</div>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-[#004850] to-[#006670] text-white p-4 rounded-2xl rounded-tr-none max-w-[75%] ml-auto text-xs font-medium shadow-sm text-left">
                        {msg.text}
                      </div>
                    )}
                  </div>
                ))}

                {/* Step: Blueprint Selection */}
                {abStep === 'select' && (
                  <div className="bg-slate-100 dark:bg-zinc-800 p-4 rounded-2xl rounded-tl-none max-w-[85%] flex gap-3 text-xs shadow-sm border border-zinc-700/50">
                    <span className="font-bold text-lg text-emerald-500">◆</span>
                    <div className="space-y-4 w-full">
                      <p>◆ Let's customize your native automation runbook layout. First, select an active configuration blueprint card to analyze.</p>
                      <div className="grid grid-cols-2 gap-2">
                          {images.map(img => (
                          <button
                              key={img.id}
                              disabled={isProcessing}
                              onClick={() => {
                                  setAbSelectedImageId(img.id);
                                  setAbChatHistory(prev => [
                                    ...prev, 
                                    { sender: "ai", text: `◆ Let's customize your native automation runbook layout. First, select an active configuration blueprint card to analyze.` }, 
                                    { sender: "user", text: `Analyze blueprint: ${img.name}` },
                                    { sender: "ai", text: "Who will be using this CRM workspace? Let's build your team registry and assign seat counts." }
                                  ]);
                                  setAbStep('chat');
                              }}
                              className="p-3 border border-zinc-700 rounded-sm hover:bg-white dark:hover:bg-zinc-700 text-xs font-bold uppercase tracking-wider text-left hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
                          >
                              {img.name}
                          </button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Step: Conversational Team Registry & Integrations */}
                {abStep === 'chat' && (
                    <div className="space-y-6">
                        {/* Team Registry Phase (Render if registry not committed) */}
                        {!abChatHistory.some(msg => msg.text.startsWith("Commit Team Registry")) && (
                            <div className="bg-slate-100 dark:bg-zinc-800 p-4 rounded-2xl rounded-tl-none max-w-[85%] flex gap-3 text-xs shadow-sm border border-zinc-700/50">
                                <div className="space-y-4 w-full">
                                    <div className="flex gap-2">
                                        <input value={tempRoleLabel} onChange={e => setTempRoleLabel(e.target.value)} placeholder="Role Name" className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-700 rounded p-2 text-xs" />
                                        <input type="number" value={tempRoleSeats} onChange={e => setTempRoleSeats(parseInt(e.target.value) || 0)} className="w-16 bg-white dark:bg-zinc-900 border border-zinc-700 rounded p-2 text-xs" />
                                        <button onClick={() => {
                                            if (!tempRoleLabel) return;
                                            setAbRoles(prev => [...prev, { roleName: tempRoleLabel, count: tempRoleSeats }]);
                                            setTempRoleLabel("");
                                            setTempRoleSeats(1);
                                        }} className="active:scale-95 bg-[#004850] text-white px-4 py-2 rounded text-xs font-bold hover:scale-[1.01] transition-all">Add Role</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {abRoles.map((role, i) => (
                                            <span key={i} className="bg-slate-200 dark:bg-zinc-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                                                {role.roleName} ({role.count})
                                                <button onClick={() => setAbRoles(prev => prev.filter((_, idx) => idx !== i))}><i className="ti ti-x" /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <button onClick={() => {
                                        setAbChatHistory(prev => [...prev,
                                            { sender: "user", text: `Commit Team Registry: ${abRoles.map(r => r.roleName).join(", ")}` },
                                            { sender: "ai", text: `◆ Understood. Which integration channels should be natively provisioned into this guide?` }
                                        ]);
                                    }} className="w-full bg-[#004850] text-white py-2 rounded text-xs font-bold uppercase hover:scale-[1.01] active:scale-[0.99] transition-all">Confirm Team Registry</button>
                                </div>
                            </div>
                        )}

                        {/* Integration Checklist Phase (Render if registry is committed) */}
                        {abChatHistory.some(msg => msg.text.startsWith("Commit Team Registry")) && (
                            <div className="bg-slate-100 dark:bg-zinc-800 p-4 rounded-2xl rounded-tl-none max-w-[85%] flex gap-3 text-xs shadow-sm border border-zinc-700/50">
                                <div className="space-y-4 w-full">
                                    <div className="space-y-1">
                                    {['Slack', 'Microsoft Teams', 'Asana', 'Trello', 'Webhooks', 'Campaigns by Pipedrive', 'Projects by Pipedrive'].map(int => (
                                        <button
                                        key={int}
                                        onClick={() => setAbSelectedIntegrations(prev => prev.includes(int) ? prev.filter(i => i !== int) : [...prev, int])}
                                        className={`w-full p-2 border rounded-sm flex items-center gap-2 text-xs font-bold active:scale-[0.99] transition-all ${abSelectedIntegrations.includes(int) ? 'bg-[#004850]/10 border-[#004850] text-[#004850]' : 'bg-white dark:bg-zinc-900 border-zinc-700'}`}
                                        >
                                        <i className={`ti ${abSelectedIntegrations.includes(int) ? 'ti-checkbox' : 'ti-square'}`} />
                                        {int}
                                        </button>
                                    ))}
                                    </div>
                                    <button
                                        disabled={isProcessing}
                                        onClick={() => {
                                            setAbChatHistory(prev => [...prev, { sender: "user", text: `Integrations: ${abSelectedIntegrations.join(", ")}`}]);
                                            compilePromptManifest();
                                        }}
                                        className="w-full bg-[#004850] text-white py-2 rounded text-xs font-bold uppercase hover:scale-[1.01] active:scale-[0.99] transition-all"
                                    >
                                        COMPILE AUTOMATION RUNBOOK
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {(abStep === 'planning' || abStep === 'stapling') && (
                  <div className="bg-slate-100 dark:bg-zinc-800 p-5 rounded-2xl rounded-tl-none max-w-[85%] flex gap-4 text-xs shadow-md border border-zinc-700/50 animate-in fade-in slide-in-from-left-2 duration-300">
                      <span className="font-bold text-lg text-emerald-500">◆</span>
                      <div className="flex items-center gap-4">
                          <div className="h-5 w-5 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin shrink-0" />
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-800 dark:text-zinc-100 tracking-tight">
                              {abStep === 'planning' 
                                ? "◆ Master Planner assembling global automation footprint map..." 
                                : `◆ Stapling Automation [${staplingState.index} of ${staplingState.total}]: Compiling native configuration steps for stage '${staplingState.currentStage}'...`
                              }
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-widest font-medium">
                              {abStep === 'planning' ? "Initializing Pipeline Analysis" : "Executing Sequential Logic Bind"}
                            </span>
                          </div>
                      </div>
                  </div>
                )}

                {abStep === 'preview' && (
                  <div className="bg-slate-100 dark:bg-zinc-800 p-4 rounded-2xl rounded-tl-none max-w-[85%] flex gap-3 text-xs shadow-sm border border-zinc-700/50">
                      <span className="font-bold text-lg text-emerald-500">◆</span>
                      <div className="w-full space-y-4">
                          <p>◆ Your native automation guidelines have been successfully generated. Review the raw model prompt manifest below.</p>
                          
                          {/* Runbook Accordion Display */}
                          <div className="mb-4">
                            {abCompiledObjects.length > 0 ? (
                                abCompiledObjects.map((item, i) => (
                                    <details key={i} className="group mb-2">
                                        <summary className="bg-white/50 dark:bg-zinc-800/40 hover:bg-[#004850]/5 p-3 rounded-lg border border-zinc-700/20 mb-2 cursor-pointer transition-all text-xs font-bold uppercase tracking-wider text-[#004850] dark:text-emerald-400">
                                            Automation Block {item.automationNumber}: {item.stageName}
                                        </summary>
                                        <div className="font-mono text-xs text-slate-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed mt-2 pl-4">
                                            <p className="font-bold">Goal: {item.operationalGoal}</p>
                                            <p className="font-bold mt-2">Impacted Roles:</p>
                                            <ul className="list-disc pl-4 mb-2">
                                              {item.impactedRoles.map((role: string, idx: number) => <li key={idx}>{role}</li>)}
                                            </ul>
                                            <p className="font-bold">Steps:</p>
                                            <ol className="list-decimal pl-4">
                                              {item.setupSteps.map((step: string, idx: number) => <li key={idx}>{step}</li>)}
                                            </ol>
                                        </div>
                                    </details>
                                ))
                            ) : (
                                <p className="text-xs text-slate-500 italic">◆ Reading aggregated sub-agent logs... No automation instructions found.</p>
                            )}
                          </div>

                          <details className="group my-4">
                            <summary className="text-xs font-bold uppercase tracking-wider text-[#004850] dark:text-emerald-400 cursor-pointer select-none">View Compiled Prompt Payload</summary>
                            <pre className="font-mono text-[11px] bg-[#0A0F1D] text-emerald-400/90 p-4 rounded-xl border border-zinc-800/80 shadow-inner overflow-x-auto whitespace-pre-wrap">{compileRawModelPromptManifest()}</pre>
                          </details>
                          
                          <div className="flex flex-wrap gap-2">
                              <button
                                  onClick={() => copyToClipboard(JSON.stringify(abCompiledObjects, null, 2))}
                                  className="flex-1 flex items-center justify-center gap-2 p-2 bg-white dark:bg-zinc-900 border border-zinc-700 text-[10px] font-bold uppercase tracking-wider text-[#004850] hover:scale-[1.01] active:scale-[0.99] transition-all rounded"
                              >
                                  <i className="ti ti-copy" /> Copy Runbook
                              </button>
                              <button
                                  onClick={() => handleDocxDownload()}
                                  className="flex-1 flex items-center justify-center gap-2 p-2 bg-white dark:bg-zinc-900 border border-zinc-700 text-[10px] font-bold uppercase tracking-wider text-[#004850] hover:scale-[1.01] active:scale-[0.99] transition-all rounded"
                              >
                                  <i className="ti ti-download" /> Download Runbook
                              </button>
                              <button
                                  onClick={() => { setAbOpen(false); setAbStep('select'); setIsAttached(false); }}
                                  className="flex-1 flex items-center justify-center gap-2 p-2 bg-white dark:bg-zinc-900 border border-zinc-700 text-[10px] font-bold uppercase tracking-wider text-[#004850] hover:scale-[1.01] active:scale-[0.99] transition-all rounded"
                              >
                                  Keep Local Only
                              </button>
                              <button 
                                  disabled={isProcessing || isAttached}
                                  onClick={() => {
                                      const payload = compileRawModelPromptManifest();
                                      setImages(prev => prev.map(img => img.id === abSelectedImageId ? { ...img, runbookManifest: payload } : img));
                                      setIsAttached(true);
                                      // Optional: Auto-close after delay? The requirement doesn't specify.
                                      // Keeping it open so feedback is visible.
                                  }}
                                  className={`flex-1 flex items-center justify-center rounded text-[10px] font-bold uppercase tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all ${isAttached ? 'bg-emerald-600 text-white' : 'bg-[#004850] text-white'}`}
                              >
                                  {isAttached ? "◆ Runbook Attached Successfully" : "Attach Runbook to Image Card"}
                              </button>
                          </div>
                      </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* 6. CLIPBOARD FEEDBACK */}
      {copyFeedback && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900 text-white rounded  z-[400] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 border border-slate-700">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">{copyFeedback}</span>
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
