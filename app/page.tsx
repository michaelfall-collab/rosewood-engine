// app/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { CRMArchitectureBlueprint } from "@/types/blueprint";
import { generateRunbookPrompt } from "@/utils/promptCompiler";
import { PIPEDRIVE_CAPABILITIES_REGISTRY } from "@/config/pipedriveCapabilities";
import { exportRunbookToDocx } from '@/utils/docxExporter';
import { serializeToRwe, deserializeFromRwe } from '@/utils/fileSerializer';

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

const getPipelineTheme = (coordinate: string) => {
  const prefix = coordinate.split('.')[0];
  switch (prefix) {
    case '1': // Lead to Waitlist
      return { border: 'border-[#1B3A6B]', text: 'text-[#1B3A6B]', bg: 'bg-[#D6E4F0]' };
    case '2': // Waitlist to Onboarding
      return { border: 'border-[#1B5E20]', text: 'text-[#1B5E20]', bg: 'bg-[#D5F5E3]' };
    case '3': // Onboarded Client
      return { border: 'border-[#4A148C]', text: 'text-[#4A148C]', bg: 'bg-[#E8DAEF]' };
    case '4': // Post Graduation & Legacy
      return { border: 'border-[#922B21]', text: 'text-[#922B21]', bg: 'bg-[#FADBD8]' };
    default:
      return { border: 'border-zinc-700', text: 'text-zinc-800 dark:text-zinc-200', bg: 'bg-zinc-100' };
  }
};

export default function ClientCockpitDashboard() {
  const [images, setImages] = useState<LiveImage[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("rw_workspace_cache");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error("Cache parsing error", e);
        }
      }
    }
    return [SYSTEM_SEED];
  });
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
  const [abStep, setAbStep] = useState<'select' | 'chat' | 'planning' | 'review' | 'stapling' | 'preview'>('select');
  const [abRoadmap, setAbRoadmap] = useState<any[]>([]);
  const [abReviewFeedback, setAbReviewFeedback] = useState("");
  const [staplingState, setStaplingState] = useState({ index: 0, total: 0, currentStage: "" });
  const [abSelectedImageId, setAbSelectedImageId] = useState<string | null>(null);
  const [abSelectedIntegrations, setAbSelectedIntegrations] = useState<string[]>([]);
  const [abChatHistory, setAbChatHistory] = useState<{ sender: "user" | "ai"; text: string; dataWidget?: any }[]>([]);
  const [abRoles, setAbRoles] = useState<{ roleName: string; count: number }[]>([]);
  const [abCompiledObjects, setAbCompiledObjects] = useState<any[]>([]);
  const [tempRoleLabel, setTempRoleLabel] = useState("");
  const [tempRoleSeats, setTempRoleSeats] = useState(1);
  const [isAttached, setIsAttached] = useState(false);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const { blueprint, abCompiledObjects: importedAbObjects } = deserializeFromRwe(text);
        const newImages = [{ ...blueprint, owner: 'Imported', deals: 0 }, ...images];
        setImages(newImages);
        if (typeof window !== 'undefined') {
          localStorage.setItem('rw_workspace_cache', JSON.stringify(newImages));
        }
        setAbCompiledObjects(prev => [...prev, ...importedAbObjects]);
        setCopyFeedback("◆ .rwe file imported successfully");
        setTimeout(() => setCopyFeedback(null), 3000);
      } catch (error) {
        console.error("Import failed:", error);
        setUiModal({
            type: "alert",
            title: "Import Error",
            message: "Failed to import .rwe file. Ensure the file is valid.",
            onCancel: () => setUiModal(null)
        });
      }
    };
    reader.readAsText(file);
  };

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

  const compilePromptManifest = async (feedback?: string) => {
    const targetImage = images.find(i => i.id === abSelectedImageId);
    if (!targetImage) return;

    // STAGE 1: Roadmap Generation (planning -> review)
    if (abStep === 'select' || abStep === 'chat' || (abStep === 'review' && feedback)) {
      setAbStep('planning');
      setIsAttached(false);

      const roadmapSchema = {
        type: "OBJECT",
        properties: {
          roadmap: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                automationNumber: { type: "STRING" },
                stageName: { type: "STRING" },
                operationalGoal: { type: "STRING" }
              },
              required: ["automationNumber", "stageName", "operationalGoal"]
            }
          }
        },
        required: ["roadmap"]
      };

      try {
        const response = await fetch('/api/compile-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt: `You are a Master CRM Planner. Analyze the provided CRM blueprint and team registry. 
            Generate a high-level roadmap of automations. 
            STRICT NAMING RULE: For each automation, automationNumber MUST use the pattern "[Pipeline Order ID + 1].[Stage Order ID + 1]" (e.g. "1.1", "1.2", "2.1").
            Integrations available: ${JSON.stringify(abSelectedIntegrations)}.
            Team Registry: ${JSON.stringify(abRoles)}.
            ${feedback ? `CRITICAL: The user has provided feedback for this revision: "${feedback}". Adjust the roadmap accordingly.` : ""}`,
            userPrompt: `Analyze this blueprint and generate the automation roadmap array: ${JSON.stringify(targetImage)}`,
            schema: roadmapSchema
          })
        });

        const data = await response.json();
        if (data.success && data.jsonObject?.roadmap) {
          setAbRoadmap(data.jsonObject.roadmap);
          setAbStep('review');
        } else {
          console.error("Roadmap generation failed:", data.error);
          setAbStep('chat'); // Fallback
        }
      } catch (error) {
        console.error("Roadmap compilation error:", error);
        setAbStep('chat');
      }
      return;
    }

    // STAGE 2: Detailed Stapling (review -> stapling -> preview)
    if (abStep === 'review' && !feedback) {
      setAbStep('stapling');
      setStaplingState({ index: 0, total: abRoadmap.length, currentStage: "" });

      const newCompiledObjects = [];

      for (const [index, item] of abRoadmap.entries()) {
        setStaplingState({ 
          index: index + 1, 
          total: abRoadmap.length, 
          currentStage: item.stageName 
        });
        
        try {
          const response = await fetch('/api/compile-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemPrompt: `You are an Enterprise CRM Systems Architect. Capabilities: ${JSON.stringify(PIPEDRIVE_CAPABILITIES_REGISTRY)}. 
              Generate detailed configuration for the following roadmap item.
              STRICT NAMING RULE: automationNumber must remain "${item.automationNumber}".`,
              userPrompt: `Generate configuration for automation goal: "${item.operationalGoal}" in stage "${item.stageName}". Roles involved: ${JSON.stringify(abRoles)}. Coordinate Index: ${item.automationNumber}`
            })
          });

          const data = await response.json();
          
          if (data.success && data.jsonObject) {
            newCompiledObjects.push(data.jsonObject);
          } else {
            newCompiledObjects.push({
              automationNumber: item.automationNumber,
              stageName: item.stageName,
              operationalGoal: item.operationalGoal,
              impactedRoles: [],
              setupSteps: ["Error: Step generation failed."],
              governanceNotes: data.error || "Failed."
            });
          }
        } catch (error: any) {
          console.error("Stapling failed:", error);
        }
      }

      setAbCompiledObjects(newCompiledObjects);
      const assembledPromptText = compileRawModelPromptManifest(newCompiledObjects);

      setTelemetryLogs(prev => [{
        type: "OUTBOUND",
        timestamp: new Date().toLocaleTimeString(),
        payload: { promptManifestAuditTrail: assembledPromptText }
      }, ...prev]);

      setAbStep('preview');
    }
  };

  const openAB = () => {
    setAbOpen(true);
    setAbStep('select');
    setAbSelectedImageId(null);
    setAbSelectedIntegrations([]);
    setAbChatHistory([]);
    setAbRoles([]);
    setStaplingState({ index: 0, total: 0, currentStage: "" });
    setIsAttached(false);
  };

  // Custom Modal State
  const [uiModal, setUiModal] = useState<ModalProps | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem("rw_api_token");
    if (savedKey) setApiKey(savedKey);
    
    // Clear sensitive auth states on load
    setApiKey("");
    setIsVerified(false);
    setTemporaryRollbackBackup(null);
  }, []);

  useEffect(() => {
    localStorage.setItem("rw_api_token", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('rw_workspace_cache', JSON.stringify(images));
  }, [images]);

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
    <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-black text-zinc-800 dark:text-zinc-200 font-sans selection:bg-[#004850]/20">
      
      {/* 1. UTILITY HEADER BAR */}
      <header className="h-14 max-h-14 w-full flex items-center justify-between px-6 bg-white dark:bg-zinc-900/40 border-b border-zinc-200/60 dark:border-zinc-800/60 sticky top-0 z-[40]">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-[#004850] rounded-sm flex items-center justify-center">
            <i className="ti ti-database text-white text-lg" />
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">ROSEWOOD ENGINE</span>
          <button
            onClick={openAB}
            className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#004850] dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-sm flex items-center gap-2 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all active:scale-95 disabled:opacity-50"
          >
            <i className="ti ti-wand" /> BUILDER
          </button>
          <button
            onClick={() => document.getElementById('rwe-import-input')?.click()}
            className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-sm flex items-center gap-2 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all active:scale-95"
          >
            <i className="ti ti-file-import" /> IMPORT .RWE
          </button>
          <input type="file" id="rwe-import-input" accept=".rwe" className="hidden" onChange={handleImport} />
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-xl px-8">
          <div className="relative flex-1 group">
            <i className="ti ti-lock text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 text-[10px]" />
            <input 
              type="password"
              placeholder="API Token..."
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setIsVerified(false); setTemporaryRollbackBackup(null); }}
              disabled={isProcessing}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm py-1.5 pl-9 pr-8 text-xs font-mono focus:outline-none focus:border-zinc-400 transition-all"
            />
            {apiKey && isVerified && (
              <button onClick={() => {setApiKey(""); setIsVerified(false); setTemporaryRollbackBackup(null);}} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-rose-500">
                <i className="ti ti-x text-[10px]" />
              </button>
            )}
          </div>

          <button 
            onClick={verifyConnection}
            disabled={isVerified || isProcessing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border transition-all active:scale-95 ${
              isVerified 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 cursor-default font-mono' 
                : 'bg-[#004850] border-[#004850] text-white cursor-pointer hover:bg-[#003840]'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isVerified ? 'bg-emerald-500 animate-pulse' : 'bg-white/40'}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {isVerified ? `LIVE // ${accountName}` : "Connect"}
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
                  className="bg-amber-500 border border-amber-600 text-white font-bold px-3 py-1.5 text-[10px] uppercase tracking-widest rounded-sm flex items-center gap-2 hover:bg-amber-600 cursor-pointer"
                >
                  <i className="ti ti-shield-alert" /> RESCUE <i className="ti ti-chevron-down" />
                </button>
                {openMenuId === 'rescue' && (
                  <div className="absolute right-0 top-9 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden z-[50]">
                    <button onClick={() => { handleRestore(); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 text-emerald-600">Restore</button>
                    <button onClick={() => { handlePromote(); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800">Promote</button>
                  </div>
                )}
              </div>
            )}
            <div className="relative">
              <button 
                onClick={() => setShowTelemetry(!showTelemetry)}
                disabled={isProcessing}
                className={`h-9 w-9 flex items-center justify-center rounded-sm border transition-all active:scale-95 ${showTelemetry ? 'bg-zinc-900 border-zinc-700 text-emerald-400' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600'}`}
                title="Telemetry Terminal"
              >
                <i className="ti ti-terminal-2" />
                {telemetryLogs.length > 0 && <span className="absolute top-2 right-2 h-1.5 w-1.5 bg-emerald-500 rounded-full" />}
              </button>
              {showTelemetry && (
                <div className="absolute right-0 top-12 w-96 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden z-[60] flex flex-col h-[80vh] min-h-0 shadow-2xl">
                  <div className="px-4 py-2 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 flex items-center justify-between">
                    <span className="font-mono text-[9px] font-black uppercase tracking-widest text-zinc-400">Execution Telemetry // Local Stack</span>
                    <button onClick={() => setTelemetryLogs([])} className="font-mono text-[9px] font-bold uppercase text-rose-500 hover:text-rose-400">Flush</button>
                  </div>
                  <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-2 font-mono text-[10px]">
                    {telemetryLogs.length === 0 ? (
                      <div className="text-zinc-500 italic py-8 text-center uppercase tracking-tighter">No active data streams.</div>
                    ) : (
                      telemetryLogs.map((log, i) => (
                        <div key={i} className="border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden">
                          <div 
                            onClick={() => setExpandedLogs(prev => prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i])}
                            className="p-2 bg-white dark:bg-zinc-950 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                          >
                            <span className={`font-bold ${log.type === 'OUTBOUND' ? 'text-emerald-600' : 'text-blue-600'}`}>[{log.type}] {log.timestamp}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(JSON.stringify(log.payload, null, 2)); }} 
                              className="text-zinc-400 hover:text-zinc-100 font-bold text-[9px]"
                            >
                              COPY
                            </button>
                          </div>
                          {expandedLogs.includes(i) && (
                            <pre className="p-3 text-zinc-600 dark:text-emerald-400/80 overflow-x-auto whitespace-pre-wrap bg-zinc-50 dark:bg-black border-t border-zinc-200 dark:border-zinc-800">
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

          <button onClick={() => setFlashMode("pipedrive")} className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-sm font-bold uppercase tracking-widest text-[10px] px-4 py-2 transition-all active:scale-95">Flash Live</button>
          <div className="relative">
            <button 
              onClick={() => setOpenMenuId(openMenuId === 'vault' ? null : 'vault')}
              disabled={isProcessing}
              className="bg-blue-600 text-white hover:bg-blue-700 rounded-sm font-bold uppercase tracking-widest text-[10px] px-4 py-2 flex items-center gap-2 transition-all active:scale-95"
            >
              Vault <i className="ti ti-chevron-down" />
            </button>
            {openMenuId === 'vault' && (
              <div className="absolute right-0 top-10 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden z-[50]">
                <button onClick={() => { handleInboundNew(); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800">Capture Snapshot</button>
                <button onClick={() => { setFlashMode('rosewood'); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-t border-zinc-200 dark:border-zinc-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">Overwrite Existing</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. CONTEXTUAL BANNERS */}
      {flashMode && (
        <div className={`px-6 py-3 flex items-center justify-between border-b animate-in slide-in-from-top duration-300 ${flashMode === 'pipedrive' ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-rose-900 border-rose-800 text-rose-100'}`}>
          <div className="flex items-center gap-3">
            <i className={`ti ${flashMode === 'pipedrive' ? 'ti-bolt' : 'ti-refresh'} text-md animate-pulse text-zinc-400`} />
            <span className="text-[11px] font-bold uppercase tracking-widest">
              {flashMode === 'pipedrive' ? 'READY TO FLASH // Select target image card to mutate production' : 'DESTRUCTIVE OVERWRITE // Select target card to replace with live image data'}
            </span>
          </div>
          <button onClick={() => setFlashMode("")} className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm active:scale-95 transition-all">Abort</button>
        </div>
      )}

      {/* 3. MAIN GALLERY SHELF */}
      <main className="flex-1 overflow-y-auto">
        <div className="h-12 px-6 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-sm border border-zinc-200 dark:border-zinc-800">
            <button 
              onClick={() => setViewLayout("grid")}
              className={`px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 ${viewLayout === 'grid' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}
            >
              <i className="ti ti-layout-grid" /> GRID
            </button>
            <button 
              onClick={() => setViewLayout("list")}
              className={`px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 ${viewLayout === 'list' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}
            >
              <i className="ti ti-list" /> LIST
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className={viewLayout === 'grid' ? "flex flex-wrap gap-8" : "flex flex-col gap-2"}>
            {(images || []).map((img) => (
              <div 
                key={img.id}
                onClick={() => handleCardClick(img.id)}
                className={`relative group p-5 cursor-pointer transition-all duration-200 rounded-sm active:scale-[0.98] border
                  ${viewLayout === 'grid' ? 'w-72 h-52 flex flex-col justify-between' : 'flex items-center gap-6 py-3 px-6'}
                  ${flashMode === 'pipedrive' ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-none'}
                  ${flashMode === 'rosewood' ? 'border-rose-500 bg-rose-500/5 ring-1 ring-rose-500/20' : ''}
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
                      className="w-full bg-zinc-50 dark:bg-black border border-zinc-400 rounded-sm px-2 py-1 font-bold outline-none text-sm"
                    />
                  ) : (
                    <h3 className="text-sm font-bold truncate tracking-tight text-zinc-900 dark:text-zinc-100">
                      {img.name}
                    </h3>
                  )}
                  <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-400 mt-1">
                    {(img.pipelines?.[0]?.stages || []).length} Stages &bull; {img.deals} Deals
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className={`px-2 py-1 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                    img.runbookManifest ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-transparent'
                  }`}>
                    <span className={`h-1 w-1 rounded-full ${img.runbookManifest ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                    {img.runbookManifest ? "Automated" : "Static"}
                  </div>
                  
                  <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === img.id ? null : img.id)}
                      className="h-8 w-8 rounded-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 flex items-center justify-center transition-colors active:scale-95"
                    >
                      <i className="ti ti-dots" />
                    </button>
                    {openMenuId === img.id && (
                      <div className="absolute right-0 bottom-10 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm z-[50] overflow-hidden shadow-xl">
                        <button onClick={() => { setRenamingId(img.id); setRenameValue(img.name); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-3"><i className="ti ti-pencil" /> Rename</button>
                        <button onClick={() => { 
                            const blob = new Blob([serializeToRwe(img, abCompiledObjects)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${img.name.replace(/\s+/g, '-').toLowerCase()}.rwe`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            setOpenMenuId(null);
                        }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-3"><i className="ti ti-download" /> Export</button>
                        <button onClick={() => deleteCard(img.id)} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-t border-zinc-200 dark:border-zinc-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-3"><i className="ti ti-trash" /> Prune</button>
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
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-8 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">
            
            <div className="px-6 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between bg-white dark:bg-zinc-900">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-sm bg-[#004850] flex items-center justify-center text-white">
                  <i className="ti ti-code" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">{activeDetail.name}</h2>
                  <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-400">{activeDetail.version}</p>
                </div>
              </div>
              <button onClick={() => setDetailId(null)} className="h-8 w-8 rounded-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center text-zinc-400 active:scale-95">
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className="flex px-8 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900">
              <button 
                onClick={() => setDetailTab("json")}
                className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all active:scale-95 ${detailTab === 'json' ? 'border-[#004850] text-[#004850] dark:text-emerald-400' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
              >
                API JSON Logic
              </button>
              <button 
                onClick={() => setDetailTab("guide")}
                className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all active:scale-95 ${detailTab === 'guide' ? 'border-[#004850] text-[#004850] dark:text-emerald-400' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
              >
                Automation Guide
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col relative p-6">
              <div className="flex justify-end mb-4">
                <button 
                  onClick={() => copyToClipboard(detailTab === 'json' ? JSON.stringify(activeDetail, null, 2) : activeDetail.runbookManifest || "")}
                  className="px-4 py-2 bg-[#004850] text-white rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-[#003840] transition-all flex items-center gap-2 active:scale-95"
                >
                  <i className="ti ti-copy" /> Copy Payload
                </button>
              </div>
              <div className="flex-1 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-6 overflow-y-auto">
                {detailTab === 'json' ? (
                  <pre className="font-mono text-[11px] text-zinc-700 dark:text-emerald-400/90 whitespace-pre-wrap leading-normal">
                    {JSON.stringify(activeDetail, null, 2)}
                  </pre>
                ) : abCompiledObjects && abCompiledObjects.length > 0 ? (
                  <div className="space-y-8 font-sans">
                    {abCompiledObjects.map((item, i) => {
                      const theme = getPipelineTheme(item.automationNumber);
                      return (
                        <div key={i} className={`border ${theme.border} rounded-sm overflow-hidden bg-white dark:bg-zinc-900 shadow-none`}>
                          {/* Stage Block Header */}
                          <div className={`px-6 py-4 ${theme.bg} border-b ${theme.border} flex items-center justify-between`}>
                            <h3 className={`text-sm font-bold uppercase tracking-tight ${theme.text}`}>
                              Automation {item.automationNumber}: {item.stageName}
                            </h3>
                          </div>

                          <div className="p-6 space-y-6">
                            {/* Operational Goal */}
                            <div>
                              <p className="text-sm text-zinc-900 dark:text-zinc-100">
                                <span className="font-bold">Goal: </span>
                                {item.operationalGoal}
                              </p>
                            </div>

                            {/* Impacted Personnel Section */}
                            <div className="space-y-2">
                              <h4 className="font-mono text-[10px] font-black uppercase tracking-widest text-zinc-400">Impacted Personnel</h4>
                              <ul className="list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
                                {item.impactedRoles.map((role: string, idx: number) => (
                                  <li key={idx} className="pl-1">{role}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Setup Cadence List */}
                            <div className="space-y-2">
                              <h4 className="font-mono text-[10px] font-black uppercase tracking-widest text-zinc-400">Setup Cadence</h4>
                              <ol className="list-decimal pl-5 font-sans text-xs tracking-normal text-zinc-700 dark:text-zinc-300 space-y-2">
                                {item.setupSteps.map((step: string, idx: number) => (
                                  <li key={idx} className="pl-2">{step}</li>
                                ))}
                              </ol>
                            </div>

                            {/* Governance Box */}
                            {item.governanceNotes && (
                              <div className="mt-6 border-l-2 border-amber-500 bg-amber-500/5 p-4 rounded-sm flex gap-3 items-start">
                                <i className="ti ti-info-circle text-amber-600 mt-0.5" />
                                <div className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                                  {item.governanceNotes}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-12 w-12 rounded-sm bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                      <i className="ti ti-clipboard-list text-zinc-400 text-xl" />
                    </div>
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No Runbook Data</h3>
                    <p className="text-xs text-zinc-500 mt-2 max-w-xs leading-relaxed italic">
                      Use the Automation Builder to compile logic for this card.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. CUSTOM UI MODALS (Prompt/Alert/Confirm) */}
      {uiModal && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm w-full max-w-sm p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200 shadow-2xl">
            <h3 className="font-bold uppercase text-[10px] tracking-widest text-[#004850] dark:text-emerald-500">{uiModal.title}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{uiModal.message}</p>
            {uiModal.type === "prompt" && (
              <input 
                id="modal-input"
                autoFocus
                placeholder={uiModal.placeholder}
                className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-sm py-2 px-3 text-sm font-mono focus:outline-none focus:border-zinc-400 transition-all"
              />
            )}
            <div className="flex justify-end gap-2 mt-2">
              {(uiModal.type === "confirm" || uiModal.type === "prompt") && (
                <button onClick={uiModal.onCancel} className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-95">Cancel</button>
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
                className="px-4 py-2 bg-[#004850] text-white rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-[#003840] transition-all active:scale-95"
              >
                {uiModal.type === "alert" ? "OK" : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTOMATION BUILDER MODAL */}
      {abOpen && (
        <div className="fixed inset-0 w-full h-full min-h-screen z-[250] flex flex-col bg-zinc-50 dark:bg-black">
          {/* Header */}
          <div className="h-14 max-h-14 flex items-center justify-between px-6 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 sticky top-0 z-[60]">
            <span className="font-mono text-[10px] font-black uppercase tracking-widest text-zinc-400">Runbook Builder // Stark Interface</span>
            <button
              onClick={() => {
                setAbOpen(false);
                setAbStep('select');
                setAbSelectedImageId(null);
                setAbSelectedIntegrations([]);
                setAbChatHistory([]);
                setAbRoles([]);
              }}
              className="h-8 w-8 flex items-center justify-center rounded-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400"
            >
              <i className="ti ti-x" />
            </button>
          </div>

          {/* Unified Chat Timeline Stream */}
          <div className="flex-1 overflow-y-auto pb-48 pt-4">
            <div className="max-w-3xl mx-auto w-full px-6">
                {/* History Messages */}
                {abChatHistory.map((msg, i) => (
                  <div key={i} className="py-8 border-b border-zinc-200/60 dark:border-zinc-800/60 last:border-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex gap-6">
                      <div className={`shrink-0 w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-mono font-bold ${msg.sender === 'ai' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400' : 'bg-[#004850] text-white'}`}>
                        {msg.sender === 'ai' ? 'AI' : '//'}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                          {msg.sender === 'ai' ? 'System Intelligence' : 'User Instruction'}
                        </div>
                        <div className={`text-sm leading-relaxed ${msg.sender === 'ai' ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-600 dark:text-zinc-400'}`}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Inline Status Indicators */}
                {(abStep === 'planning' || abStep === 'stapling') && (
                  <div className="py-8 animate-in fade-in duration-300">
                    <div className="flex items-center gap-4 text-zinc-400">
                      <div className="h-4 w-4 border-2 border-zinc-200 dark:border-zinc-800 border-t-zinc-400 dark:border-t-zinc-600 rounded-full animate-spin" />
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-medium italic uppercase tracking-tighter">
                          {abStep === 'planning' 
                            ? "Master Planner assembling global automation footprint map..." 
                            : `Stapling Automation [${staplingState.index}/${staplingState.total}]: Compiling native configuration for '${staplingState.currentStage}'...`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview State Result Rendering */}
                {abStep === 'preview' && (
                  <div className="py-8 space-y-8">
                    <div className="space-y-4">
                      {abCompiledObjects.map((item, i) => (
                        <details key={i} className="group border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden transition-all hover:border-zinc-400 dark:hover:border-zinc-600">
                          <summary className="p-4 bg-zinc-50 dark:bg-zinc-900/50 cursor-pointer select-none flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[10px] font-bold bg-[#004850] text-white px-2 py-0.5 rounded-sm">{item.automationNumber}</span>
                              <span className="text-xs font-bold uppercase tracking-widest text-zinc-800 dark:text-zinc-200">{item.stageName}</span>
                            </div>
                            <i className="ti ti-chevron-down text-zinc-400 group-open:rotate-180 transition-transform" />
                          </summary>
                          <div className="p-6 bg-white dark:bg-black space-y-6 text-sm">
                            <div>
                              <h4 className="font-mono text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Operational Goal</h4>
                              <p className="text-zinc-700 dark:text-zinc-300">{item.operationalGoal}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                <h4 className="font-mono text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Impacted Roles</h4>
                                <ul className="space-y-1">
                                  {item.impactedRoles.map((role: string, idx: number) => (
                                    <li key={idx} className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                      <span className="h-1 w-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                                      {role}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-mono text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Setup Steps</h4>
                                <ol className="space-y-2">
                                  {item.setupSteps.map((step: string, idx: number) => (
                                    <li key={idx} className="flex gap-3 text-zinc-600 dark:text-zinc-400">
                                      <span className="font-mono text-[10px] font-bold text-zinc-300 dark:text-zinc-700 mt-0.5">{idx + 1}.</span>
                                      {step}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                          </div>
                        </details>
                      ))}
                    </div>

                    <details className="group border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden bg-white dark:bg-zinc-900">
                      <summary className="p-4 cursor-pointer select-none flex items-center justify-between text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        <span className="font-mono text-[10px] font-black uppercase tracking-widest">Raw Model Prompt Manifest</span>
                        <i className="ti ti-code" />
                      </summary>
                      <div className="relative">
                        <button
                          onClick={() => copyToClipboard(compileRawModelPromptManifest())}
                          className="absolute top-4 right-4 z-10 h-8 w-8 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-sm transition-all border border-zinc-700 shadow-xl"
                        >
                          <i className="ti ti-copy" />
                        </button>
                        <pre className="p-6 text-[11px] font-mono text-zinc-500 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {compileRawModelPromptManifest()}
                        </pre>
                      </div>
                    </details>
                  </div>
                )}
            </div>
          </div>

          {/* FLOATING ACTION STATION */}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 max-w-3xl w-full px-6 z-[70] animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-sm p-4 overflow-hidden">
              
              {/* Stage: Selection */}
              {abStep === 'select' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Select Target Blueprint</span>
                    <span className="h-1.5 w-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {images.map(img => (
                      <button
                        key={img.id}
                        disabled={isProcessing}
                        onClick={() => {
                          setAbSelectedImageId(img.id);
                          setAbChatHistory(prev => [
                            ...prev, 
                            { sender: "ai", text: `Let's customize your native automation runbook layout. First, select an active configuration blueprint card to analyze.` }, 
                            { sender: "user", text: `Analyze blueprint: ${img.name}` },
                            { sender: "ai", text: "Who will be using this CRM workspace? Let's build your team registry and assign seat counts." }
                          ]);
                          setAbStep('chat');
                        }}
                        className="px-4 py-3 text-left rounded-sm border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all group"
                      >
                        <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white">{img.name}</span>
                        <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest">Asset // Local</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stage: Chat (Team & Integrations) */}
              {abStep === 'chat' && (
                <div className="space-y-6">
                  {!abChatHistory.some(msg => msg.text.startsWith("Commit Team Registry")) ? (
                    <div className="space-y-4">
                      <div className="flex gap-2 p-1 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-sm">
                        <input 
                          value={tempRoleLabel} 
                          onChange={e => setTempRoleLabel(e.target.value)} 
                          placeholder="Role Name..." 
                          className="flex-1 bg-transparent px-4 py-2 text-sm outline-none text-zinc-800 dark:text-zinc-200" 
                        />
                        <input 
                          type="number" 
                          value={tempRoleSeats} 
                          onChange={e => setTempRoleSeats(parseInt(e.target.value) || 0)}
                          className="w-16 bg-transparent px-2 py-2 text-sm text-center outline-none border-x border-zinc-200 dark:border-zinc-800 text-zinc-400 font-mono" 
                        />
                        <button 
                          onClick={() => {
                            if (!tempRoleLabel) return;
                            setAbRoles(prev => [...prev, { roleName: tempRoleLabel, count: tempRoleSeats }]);
                            setTempRoleLabel("");
                            setTempRoleSeats(1);
                          }}
                          className="bg-[#004850] text-white px-4 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {abRoles.map((role, i) => (
                          <span key={i} className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                            {role.roleName} <span className="font-mono text-zinc-400">{role.count}</span>
                            <button onClick={() => setAbRoles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-rose-500"><i className="ti ti-x" /></button>
                          </span>
                        ))}
                      </div>
                      <button 
                        onClick={() => {
                          setAbChatHistory(prev => [...prev,
                            { sender: "user", text: `Commit Team Registry: ${abRoles.map(r => r.roleName).join(", ")}` },
                            { sender: "ai", text: `Understood. Which integration channels should be natively provisioned into this guide?` }
                          ]);
                        }} 
                        className="w-full h-12 flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-black rounded-sm text-[10px] font-bold uppercase tracking-[0.2em] active:scale-95 transition-all"
                      >
                        Confirm Registry
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {['Slack', 'Microsoft Teams', 'Asana', 'Trello', 'Webhooks', 'Campaigns', 'Projects'].map(int => (
                          <button
                            key={int}
                            onClick={() => setAbSelectedIntegrations(prev => prev.includes(int) ? prev.filter(i => i !== int) : [...prev, int])}
                            className={`p-3 rounded-sm border text-left transition-all ${abSelectedIntegrations.includes(int) ? 'bg-[#004850] border-[#004850] text-white' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-widest block">{int}</span>
                          </button>
                        ))}
                      </div>
                      <button
                        disabled={isProcessing}
                        onClick={() => {
                          setAbChatHistory(prev => [...prev, { sender: "user", text: `Integrations: ${abSelectedIntegrations.join(", ")}`}]);
                          compilePromptManifest();
                        }}
                        className="w-full h-12 flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-black rounded-sm text-[10px] font-bold uppercase tracking-[0.2em] active:scale-95 transition-all"
                      >
                        Compile Runbook
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Stage: Review (Roadmap) */}
              {abStep === 'review' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Roadmap Validation</span>
                    <span className="font-mono text-[10px] text-zinc-400 italic">Review {abRoadmap.length} items</span>
                  </div>
                  <div className="flex flex-col gap-2 p-1 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-sm">
                    <textarea 
                      value={abReviewFeedback}
                      onChange={(e) => setAbReviewFeedback(e.target.value)}
                      placeholder="Enter feedback or refinement instructions..."
                      className="w-full bg-transparent px-4 py-3 text-xs min-h-[60px] max-h-32 outline-none text-zinc-800 dark:text-zinc-200"
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { compilePromptManifest(abReviewFeedback); setAbReviewFeedback(""); }}
                        className="flex-1 h-10 flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 active:scale-95 transition-all"
                      >
                        Rebuild
                      </button>
                      <button 
                        onClick={() => compilePromptManifest()}
                        className="flex-[2] h-10 flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-black rounded-sm text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all"
                      >
                        Approve & Execute
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Stage: Preview Actions */}
              {abStep === 'preview' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDocxDownload()}
                    className="flex-1 h-12 flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-sm text-[10px] font-bold uppercase tracking-widest text-zinc-800 dark:text-zinc-200 active:scale-95 transition-all"
                  >
                    <i className="ti ti-download" /> Download
                  </button>
                  <button 
                    disabled={isProcessing || isAttached}
                    onClick={() => {
                        const payload = compileRawModelPromptManifest();
                        setImages(prev => prev.map(img => img.id === abSelectedImageId ? { ...img, runbookManifest: payload } : img));
                        setIsAttached(true);
                    }}
                    className={`flex-[2] h-12 flex items-center justify-center rounded-sm text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all ${isAttached ? 'bg-emerald-600 text-white' : 'bg-zinc-900 dark:bg-white text-white dark:text-black'}`}
                  >
                    {isAttached ? "◆ Runbook Attached" : "Attach to Card"}
                  </button>
                  <button 
                    onClick={() => { setAbOpen(false); setAbStep('select'); }}
                    className="w-12 h-12 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-sm text-zinc-400 active:scale-95 transition-all"
                  >
                    <i className="ti ti-logout" />
                  </button>
                </div>
              )}

              {/* Neutral Loading Placeholder for Station */}
              {(abStep === 'planning' || abStep === 'stapling') && (
                <div className="p-4 flex items-center justify-center gap-3">
                  <div className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. CLIPBOARD FEEDBACK */}
      {copyFeedback && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-zinc-900 text-white rounded-sm z-[400] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 border border-zinc-700">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">{copyFeedback}</span>
        </div>
      )}

      {/* 7. PROCESSING SPINNER */}
      {isProcessing && (
        <div className="fixed inset-0 z-[500] bg-zinc-950/20 backdrop-blur-[1px] flex items-center justify-center cursor-wait">
          <div className="h-10 w-10 border-2 border-zinc-200 dark:border-zinc-800 border-t-[#004850] rounded-sm animate-spin " />
        </div>
      )}

    </div>
  );
}
