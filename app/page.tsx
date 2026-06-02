'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { CRMArchitectureBlueprint, StageOperationalContext, PipelineStageSpec } from "@/types/blueprint";
import { generateRunbookPrompt } from "@/utils/promptCompiler";
import { PIPEDRIVE_CAPABILITIES_REGISTRY } from "@/config/pipedriveCapabilities";
import { exportRunbookToDocx } from '@/utils/docxExporter';
import { serializeToRwe, deserializeFromRwe } from '@/utils/fileSerializer';

type LiveImage = CRMArchitectureBlueprint & { 
  owner: string; 
  deals: number; 
  runbookManifest?: string;
  compiledRunbook?: any[];
  selectedIntegrations?: string[];
  abCompiledObjects?: any[];
};

const generateRweId = () => "rwe_card_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);

export function getLocalFallbackGuess(stageName: string): StageOperationalContext {
  const lower = stageName.toLowerCase();
  let targetDirective = "";
  let stuckThreshold = "7 Days";

  if (lower.includes("lead") || lower.includes("inbox") || lower.includes("intake") || lower.includes("inbound")) {
    targetDirective = "Catch inbound inquiries, perform initial qualification, and route to a representative once ICP fit is confirmed.";
    stuckThreshold = "3 Days";
  } else if (lower.includes("contact") || lower.includes("outreach") || lower.includes("call") || lower.includes("schedule") || lower.includes("phone")) {
    targetDirective = "Outreach to prospect and get a qualified discovery call booked on the calendar.";
    stuckThreshold = "7 Days";
  } else if (lower.includes("demo") || lower.includes("present") || lower.includes("meeting") || lower.includes("pitch")) {
    targetDirective = "Demonstrate core platform capabilities. Success = prospect requests formal pricing and implementation plan.";
    stuckThreshold = "10 Days";
  } else if (lower.includes("proposal") || lower.includes("quote") || lower.includes("price") || lower.includes("pricing")) {
    targetDirective = "Deliver custom agreement and answer objections. Success = signed pricing approval received.";
    stuckThreshold = "14 Days";
  } else if (lower.includes("contract") || lower.includes("negotiat") || lower.includes("legal") || lower.includes("sign")) {
    targetDirective = "Secure signed contract and collect setup deposit. Success = fully executed agreement on file.";
    stuckThreshold = "14 Days";
  } else if (lower.includes("onboard") || lower.includes("welcome") || lower.includes("setup")) {
    targetDirective = "Collect technical requirements and configure team workspace. Success = client completes kickoff call.";
    stuckThreshold = "14 Days";
  } else if (lower.includes("waitlist") || lower.includes("nurture") || lower.includes("hold")) {
    targetDirective = "Maintain passive touchpoints on a schedule. Success = prospect re-opens active sales conversation.";
    stuckThreshold = "30 Days";
  } else {
    targetDirective = `Progress deal through ${stageName} and resolve all blockers. Success = clean handoff to next phase.`;
    stuckThreshold = "7 Days";
  }

  return { targetDirective, stuckThreshold, isRecurringLoop: false, recurrenceDays: 7 };
}

export async function fetchAITelemetryGuesses(
  stages: { name: string; pipelineId: number }[]
): Promise<Record<string, StageOperationalContext>> {
  try {
    const response = await fetch('/api/compile-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        mode: 'telemetry-batch', 
        stages: stages.map((s, i) => ({ name: s.name, order_nr: i + 1 })) 
      })
    });
    const data = await response.json();
    if (data.success && data.jsonObject?.stages) {
      const result: Record<string, StageOperationalContext> = {};
      data.jsonObject.stages.forEach((entry: any, index: number) => {
        const stageName = stages[index].name;
        result[stageName] = {
          targetDirective: entry.targetDirective,
          stuckThreshold: entry.stuckThreshold,
          isRecurringLoop: false,
          recurrenceDays: 7
        };
      });
      return result;
    }
  } catch (e) {
    console.warn("AI telemetry batch guess failed, using local fallback", e);
  }
  const fallback: Record<string, StageOperationalContext> = {};
  for (const s of stages) fallback[s.name] = getLocalFallbackGuess(s.name);
  return fallback;
}

export function ensureStageTelemetry(blueprint: CRMArchitectureBlueprint): CRMArchitectureBlueprint {
  if (!blueprint || !blueprint.pipelines) return blueprint;
  
  const updatedPipelines = blueprint.pipelines.map(pipeline => {
    if (!pipeline.stages) return pipeline;
    return {
      ...pipeline,
      stages: pipeline.stages.map(stage => {
        const rawTelemetry = (stage as any).operational_telemetry || {};
        const legacyObjective = rawTelemetry.stage_objective || rawTelemetry.humanObjective || "";
        const legacyOutcome = rawTelemetry.desiredOutcome || "";
        const targetDirective = rawTelemetry.targetDirective ||
          (legacyObjective && legacyOutcome ? `${legacyObjective} Success: ${legacyOutcome}` : legacyObjective || legacyOutcome || "");

        const stuckThreshold = rawTelemetry.real_world_friction || rawTelemetry.stuckThreshold || "";
        const routingDropdownKey = rawTelemetry.router_trigger_field || rawTelemetry.routingDropdownKey || "";
        const isRecurringLoop = rawTelemetry.is_recurring_loop !== undefined 
          ? rawTelemetry.is_recurring_loop 
          : (rawTelemetry.isRecurringLoop !== undefined ? rawTelemetry.isRecurringLoop : false);
        const recurrenceDays = rawTelemetry.recurrenceDays !== undefined ? rawTelemetry.recurrenceDays : 7;
        
        return {
          ...stage,
          operational_telemetry: {
            targetDirective,
            stuckThreshold,
            routingDropdownKey,
            isRecurringLoop,
            recurrenceDays
          }
        };
      })
    };
  });
  
  return {
    ...blueprint,
    pipelines: updatedPipelines
  };
}

export function deriveAutomationCoordinate(
  item: any,
  itemIndex: number,
  runbook: any[],
  blueprint?: CRMArchitectureBlueprint
): string {
  const stageName: string = item?.stageName || "";
  const itemPipelineId = item?.pipelineId;
  const itemStageId = item?.stageId;

  if (itemPipelineId === "GLOBAL" || itemStageId === "GLOBAL") {
    const globalItems = runbook.filter((b: any) => b?.pipelineId === "GLOBAL" || b?.stageId === "GLOBAL");
    const globalRank = globalItems.findIndex((_: any, gi: number) => {
      let absCount = 0;
      for (let i = 0; i < runbook.length; i++) {
        if (runbook[i]?.pipelineId === "GLOBAL" || runbook[i]?.stageId === "GLOBAL") {
          if (absCount === gi) return i === itemIndex;
          absCount++;
        }
      }
      return false;
    });
    return `G.0.${globalRank + 1}`;
  }

  if (!blueprint || !blueprint.pipelines) return `1.1.1`;
  let pIdx = -1;
  let sIdx = -1;

  for (let pi = 0; pi < blueprint.pipelines.length; pi++) {
    const pipeline = blueprint.pipelines[pi];
    const si = pipeline.stages.findIndex(s => s.name === stageName);
    if (si !== -1) { pIdx = pi; sIdx = si; break; }
  }

  if (pIdx === -1) return `1.1.1`;

  let count = 0;
  for (let i = 0; i <= itemIndex; i++) {
    const b = runbook[i];
    if (b?.stageName === stageName && b?.pipelineId !== "GLOBAL" && b?.stageId !== "GLOBAL") {
      count++;
    }
  }

  return `${pIdx + 1}.${sIdx + 1}.${count}`;
}

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
  const [images, setImages] = useState<LiveImage[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("rw_workspace_cache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return parsed.map(img => ensureStageTelemetry(img) as LiveImage);
          }
        } catch (e) {
          console.error("Cache parsing error", e);
        }
      }
    }
    return [ensureStageTelemetry(SYSTEM_SEED) as LiveImage];
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
  const [showRawJson, setShowRawJson] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [telemetryLogs, setTelemetryLogs] = useState<{ type: 'OUTBOUND' | 'INBOUND', timestamp: string, payload: any }[]>([]);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [expandedLogs, setExpandedLogs] = useState<number[]>([]);

  // Automation Builder States
  const [abOpen, setAbOpen] = useState(false);
  const [abStep, setAbStep] = useState<'select' | 'preflight' | 'chat' | 'planning' | 'review' | 'stapling' | 'preview'>('select');
  const [abRoadmap, setAbRoadmap] = useState<any[]>([]);
  const [abReviewFeedback, setAbReviewFeedback] = useState("");
  const [staplingState, setStaplingState] = useState({ index: 0, total: 0, currentStage: "" });
  const [abSelectedImageId, setAbSelectedImageId] = useState<string | null>(null);
  const [abSelectedIntegrations, setAbSelectedIntegrations] = useState<string[]>([]);
  const [abChatHistory, setAbChatHistory] = useState<{ sender: "user" | "ai"; text: string; dataWidget?: any }[]>([]);
  const [visibleChatHistory, setVisibleChatHistory] = useState<any[]>([]);
  const [abRoles, setAbRoles] = useState<{ roleName: string; count: number }[]>([]);
  const [abCompiledObjects, setAbCompiledObjects] = useState<any[]>([]);
  const [tempRoleLabel, setTempRoleLabel] = useState("");
  const [tempRoleSeats, setTempRoleSeats] = useState(1);
  const [isAttached, setIsAttached] = useState(false);
  const [abTelemetryGuesses, setAbTelemetryGuesses] = useState<Record<string, StageOperationalContext>>({});
  const [isFetchingGuesses, setIsFetchingGuesses] = useState(false);
  const [abChatInput, setAbChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  // Fire a real Gemini background call for AI telemetry guesses the moment a card enters preflight
  useEffect(() => {
    if (abStep !== 'preflight' || !abSelectedImageId) return;
    const targetImage = images.find(img => img.id === abSelectedImageId);
    if (!targetImage) return;

    // Seed immediately with fast local fallbacks so UI is never blank
    const initial: Record<string, StageOperationalContext> = {};
    for (const pipeline of targetImage.pipelines) {
      for (const stage of pipeline.stages) {
        initial[stage.name] = getLocalFallbackGuess(stage.name);
      }
    }
    setAbTelemetryGuesses(initial);

    // Then fire async AI call and upgrade guesses when it resolves
    setIsFetchingGuesses(true);
    const stageList = targetImage.pipelines.flatMap((p, pIdx) =>
      p.stages.map(s => ({ name: s.name, pipelineId: pIdx + 1 }))
    );
    fetchAITelemetryGuesses(stageList).then(result => {
      setAbTelemetryGuesses(result);
      setIsFetchingGuesses(false);
    }).catch(() => setIsFetchingGuesses(false));
  }, [abStep, abSelectedImageId]);

  const updateRunbookObjectField = (itemIndex: number, fieldKey: string, newValue: any) => {
    setImages(prev => prev.map(img => img.id === detailId ? {
      ...img,
      compiledRunbook: (img.compiledRunbook || []).map((obj, i) => i === itemIndex ? { ...obj, [fieldKey]: newValue } : obj)
    } : img));
  };

  const handleAddNewManualBlock = (mode: "stage" | "global" = "stage") => {
    if (!detailId) return;
    const targetImg = images.find(img => img.id === detailId);
    const firstPipeline = targetImg?.pipelines?.[0];
    const firstStage = firstPipeline?.stages?.[0];
    const isGlobal = mode === "global";
    setImages(prev => prev.map(img => img.id === detailId ? {
      ...img,
      compiledRunbook: [...(img.compiledRunbook || []), {
        automationNumber: "", 
        stageName: isGlobal ? "GLOBAL" : (firstStage?.name || "MANUAL CONFIGURATION STAGE"),
        operationalGoal: isGlobal ? "Define account-wide trigger and global action..." : "Enter stage automation goal...",
        impactedRoles: [],
        setupSteps: [isGlobal ? "Configure global trigger condition..." : "Configure trigger condition..."],
        governanceNotes: "",
        pipelineId: isGlobal ? "GLOBAL" : undefined,
        stageId: isGlobal ? "GLOBAL" : undefined,
      }]
    } : img));
  };

  const handleDeleteAutomationBlock = (itemIndex: number) => {
    if (!detailId) return;
    setImages(prev => prev.map(img => img.id === detailId ? {
      ...img,
      compiledRunbook: (img.compiledRunbook || []).filter((_, idx) => idx !== itemIndex)
    } : img));
  };

  const moveAutomationBlockUp = (index: number) => {
    if (index === 0 || !detailId) return;
    setImages(prev => prev.map(img => img.id === detailId ? {
      ...img,
      compiledRunbook: (() => {
        const dataCopy = [...(img.compiledRunbook || [])];
        const targetItem = dataCopy[index];
        dataCopy[index] = dataCopy[index - 1];
        dataCopy[index - 1] = targetItem;
        return dataCopy;
      })()
    } : img));
  };

  const moveAutomationBlockDown = (index: number) => {
    if (!detailId) return;
    setImages(prev => prev.map(img => {
      const runbook = img.compiledRunbook || [];
      if (img.id !== detailId || index >= runbook.length - 1) return img;
      const dataCopy = [...runbook];
      const targetItem = dataCopy[index];
      dataCopy[index] = dataCopy[index + 1];
      dataCopy[index + 1] = targetItem;
      return { ...img, compiledRunbook: dataCopy };
    }));
  };

  const handleAddCadenceStep = (itemIndex: number) => {
    if (!detailId) return;
    setImages(prev => prev.map(img => img.id === detailId ? {
      ...img,
      compiledRunbook: (img.compiledRunbook || []).map((obj, i) => i === itemIndex ? { 
        ...obj, 
        setupSteps: [...obj.setupSteps, "New step..."] 
      } : obj)
    } : img));
  };

  const handleDeleteCadenceStep = (itemIndex: number, stepIndex: number) => {
    if (!detailId) return;
    setImages(prev => prev.map(img => img.id === detailId ? {
      ...img,
      compiledRunbook: (img.compiledRunbook || []).map((obj, i) => i === itemIndex ? { 
        ...obj, 
        setupSteps: obj.setupSteps.filter((_step: string, sIdx: number) => sIdx !== stepIndex) 
      } : obj)
    } : img));
  };

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedConfig, setPastedConfig] = useState("");

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Import handler triggered");
    const file = e.target.files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setTimeout(() => {
        try {
          const text = event.target?.result as string;
          const { blueprint, abCompiledObjects: importedAbObjects } = deserializeFromRwe(text);
          const enrichedBlueprint = ensureStageTelemetry(blueprint);
          const rehydratedCard: LiveImage = { 
              ...enrichedBlueprint, 
              id: generateRweId(), 
              owner: 'Imported', 
              deals: 0, 
              compiledRunbook: importedAbObjects,
              selectedIntegrations: []
          };
          const newImages = [rehydratedCard, ...images];
          setImages(newImages);
          if (typeof window !== 'undefined') {
            localStorage.setItem('rw_workspace_cache', JSON.stringify(newImages));
          }
          setCopyFeedback("◆ File imported successfully");
          setTimeout(() => setCopyFeedback(null), 3000);
        } catch (error) {
          console.error("Import failed:", error);
          setUiModal({
              type: "alert",
              title: "Import Error",
              message: "Failed to import file. Ensure the file is valid.",
              onCancel: () => setUiModal(null)
          });
        } finally {
          setIsProcessing(false);
        }
      }, 50);
    };
    reader.readAsText(file);
  };
 
  const handlePasteImport = () => {
    setIsProcessing(true);
    setTimeout(() => {
      try {
        const importedObj = JSON.parse(pastedConfig);
        if (importedObj.type === "ROSEWOOD_ENGINE_PROPRIETARY_EXPORT") {
          const enrichedBlueprint = ensureStageTelemetry(importedObj.blueprint);
          const hydratedObj: LiveImage = {
            ...enrichedBlueprint,
            id: generateRweId(),
            owner: 'Imported (Paste)',
            deals: 0,
            compiledRunbook: importedObj.abCompiledObjects || []
          };
          setImages(prev => [hydratedObj, ...prev]);
          setIsPasteModalOpen(false);
          setPastedConfig("");
          setCopyFeedback("◆ Data imported successfully");
          setTimeout(() => setCopyFeedback(null), 3000);
        } else {
          throw new Error("Invalid data type");
        }
      } catch (e) {
        setUiModal({
          type: "alert",
          title: "Import Error",
          message: "Failed to parse data. Ensure it is a valid export stream.",
          onCancel: () => setUiModal(null)
        });
      } finally {
        setIsProcessing(false);
      }
    }, 50);
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

  const [uiModal, setUiModal] = useState<ModalProps | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem("rw_api_token");
    if (savedKey) setApiKey(savedKey);
    setIsVerified(false);
    setTemporaryRollbackBackup(null);
  }, []);

  useEffect(() => {
    localStorage.setItem("rw_api_token", apiKey);
  }, [apiKey]);

  useEffect(() => {
    const cleanImages = images.map(({ runbookManifest, ...img }) => img);
    localStorage.setItem('rw_workspace_cache', JSON.stringify(cleanImages));
  }, [images]);

  const activeDetail = useMemo(() => images.find(i => i.id === detailId), [images, detailId]);

  const verifyConnection = async () => {
    if (!apiKey || apiKey.length < 5) {
      setUiModal({
        type: "alert",
        title: "Connection Error",
        message: "Invalid Password format. Please check your credential string.",
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
          title: "Sign In Failed",
          message: "The system rejected this password. Ensure the token is valid.",
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
      title: "Copy Activity",
      message: "Enter a name for this account copy:",
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
            setImages(prev => [{ ...data.blueprint, id: generateRweId(), name: label, owner: "Live Copy", deals: 0 }, ...prev]);
            setTelemetryLogs(prev => [{ type: 'INBOUND', timestamp: new Date().toLocaleTimeString(), payload: data.blueprint }, ...prev]);
          }
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleCardClick = async (id: string) => {
    if (!flashMode) { 
      const target = images.find(i => i.id === id);
      if (target) {
        setDetailId(id);
        setAbCompiledObjects(target.compiledRunbook || []);
        setAbSelectedIntegrations(target.selectedIntegrations || []);
      }
      return; 
    }
    const target = images.find(i => i.id === id);
    if (!target) return;

    if (!isVerified) {
      setUiModal({
        type: "alert",
        title: "Action Blocked",
        message: "You must sign in before syncing data.",
        onCancel: () => setUiModal(null)
      });
      return;
    }

    setUiModal({
      type: "confirm",
      title: flashMode === "pipedrive" ? "Sync Confirmation" : "Overwrite Confirmation",
      message: flashMode === "pipedrive" 
        ? `Are you sure you want to SYNC '${target.name}' to the live account? This will change your live pipelines.`
        : `Are you sure you want to REPLACE '${target.name}' with live data? Local work will be lost.`,
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
              title: "Update Failed",
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
    setCopyFeedback("◆ Data copied to clipboard");
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const deleteCard = (id: string) => {
    setUiModal({
      type: "confirm",
      title: "DELETE CARD",
      message: "Are you sure? This cannot be undone.",
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
        setCopyFeedback("Revert Successful");
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
      title: "Save Copy",
      message: "Enter a title for this copy:",
      placeholder: "New Archived Name...",
      onCancel: () => setUiModal(null),
      onConfirm: async (label) => {
        setUiModal(null);
        if (!label) return;
        setImages(prev => [{ ...temporaryRollbackBackup, id: generateRweId(), name: label, owner: "Internal Save", deals: 0 }, ...prev]);
        setTemporaryRollbackBackup(null);
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-black text-zinc-800 dark:text-zinc-200 font-sans selection:bg-[#004850]/20">
      <input 
        id="rwe-import-input"
        type="file" 
        accept=".rwe"
        onChange={handleImport}
        className="hidden"
      />
      
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
            <i className="ti ti-wand" /> AUTO-BUILDER
          </button>
          <button
            onClick={() => document.getElementById('rwe-import-input')?.click()}
            className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-sm flex items-center gap-2 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all active:scale-95"
          >
            <i className="ti ti-file-import" /> IMPORT FILE
          </button>
          <button
            onClick={() => setIsPasteModalOpen(true)}
            className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-sm flex items-center gap-2 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all active:scale-95"
          >
            <i className="ti ti-clipboard-check" /> PASTE DATA
          </button>
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
          {temporaryRollbackBackup && (
            <div className="relative">
              <button 
                onClick={() => setOpenMenuId(openMenuId === 'rescue' ? null : 'rescue')}
                className="bg-amber-500 border border-amber-600 text-white font-bold px-3 py-1.5 text-[10px] uppercase tracking-widest rounded-sm flex items-center gap-2 hover:bg-amber-600 cursor-pointer"
              >
                <i className="ti ti-shield-alert" /> UNDO <i className="ti ti-chevron-down" />
              </button>
              {openMenuId === 'rescue' && (
                <div className="absolute right-0 top-9 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden z-[50]">
                  <button onClick={() => { handleRestore(); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 text-emerald-600">Revert All Changes</button>
                  <button onClick={() => { handlePromote(); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800">Save as Copy</button>
                </div>
              )}
            </div>
          )}
          <div className="relative">
            <button 
              onClick={() => setShowTelemetry(!showTelemetry)}
              disabled={isProcessing}
              className={`h-9 w-9 flex items-center justify-center rounded-sm border transition-all active:scale-95 ${showTelemetry ? 'bg-zinc-900 border-zinc-700 text-emerald-400' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600'}`}
              title="Activity Log"
            >
              <i className="ti ti-terminal-2" />
              {telemetryLogs.length > 0 && <span className="absolute top-2 right-2 h-1.5 w-1.5 bg-emerald-500 rounded-full" />}
            </button>
            {showTelemetry && (
              <div className="absolute right-0 top-12 w-96 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden z-[60] flex flex-col h-[80vh] min-h-0 shadow-2xl">
                <div className="px-4 py-2 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 flex items-center justify-between">
                  <span className="font-mono text-[9px] font-black uppercase tracking-widest text-zinc-400">System Activity Log // Internal History</span>
                  <button onClick={() => setTelemetryLogs([])} className="font-mono text-[9px] font-bold uppercase text-rose-500 hover:text-rose-400">CLEAR HISTORY</button>
                </div>
                <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-2 font-mono text-[10px]">
                  {telemetryLogs.length === 0 ? (
                    <div className="text-zinc-500 italic py-8 text-center uppercase tracking-tighter">No recent data activity.</div>
                  ) : (
                    telemetryLogs.map((log, i) => (
                      <div key={i} className="border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden">
                        <div 
                          onClick={() => setExpandedLogs(prev => prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i])}
                          className="p-2 bg-white dark:bg-zinc-950 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                        >
                          <span className={`font-bold ${log.type === 'OUTBOUND' ? 'text-emerald-600' : 'text-blue-600'}`}>[{log.type === 'OUTBOUND' ? 'SENT' : 'RECEIVED'}] {log.timestamp}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(JSON.stringify(log.payload, null, 2)); }} 
                            className="text-zinc-400 hover:text-zinc-100 font-bold text-[9px]"
                          >
                            COPY
                          </button>
                        </div>
                        {expandedLogs.includes(i) && (
                          <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] bg-zinc-50 dark:bg-black p-3 text-zinc-600 dark:text-emerald-400/80 border-t border-zinc-200 dark:border-zinc-800">
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
          <button onClick={() => setFlashMode("pipedrive")} className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-sm font-bold uppercase tracking-widest text-[10px] px-4 py-2 transition-all active:scale-95">Sync to Account</button>
          <div className="relative">
            <button 
              onClick={() => setOpenMenuId(openMenuId === 'vault' ? null : 'vault')}
              disabled={isProcessing}
              className="bg-blue-600 text-white hover:bg-blue-700 rounded-sm font-bold uppercase tracking-widest text-[10px] px-4 py-2 flex items-center gap-2 transition-all active:scale-95"
            >
              Library <i className="ti ti-chevron-down" />
            </button>
            {openMenuId === 'vault' && (
              <div className="absolute right-0 top-10 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden z-[50]">
                <button onClick={() => { handleInboundNew(); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800">Copy from Account</button>
                <button onClick={() => { setFlashMode('rosewood'); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-t border-zinc-200 dark:border-zinc-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">Replace with Live</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {flashMode && (
        <div className={`px-6 py-3 flex items-center justify-between border-b animate-in slide-in-from-top duration-300 ${flashMode === 'pipedrive' ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-rose-900 border-rose-800 text-rose-100'}`}>
          <div className="flex items-center gap-3">
            <i className={`ti ${flashMode === 'pipedrive' ? 'ti-bolt' : 'ti-refresh'} text-md animate-pulse text-zinc-400`} />
            <span className="text-[11px] font-bold uppercase tracking-widest">
              {flashMode === 'pipedrive' ? 'READY TO SYNC // Select a card to push changes to your account' : 'DANGER: OVERWRITE // Select a card to replace its data with live account info'}
            </span>
          </div>
          <button onClick={() => setFlashMode("")} className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm active:scale-95 transition-all">Abort</button>
        </div>
      )}

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
                  {(() => {
                    const pCount = img.pipelines?.length || 0;
                    const sCount = img.pipelines?.reduce((acc, p) => acc + (p.stages?.length || 0), 0) || 0;
                    const fCount = img.customFields?.length || 0;
                    const aCount = (img as any).abCompiledObjects?.length || (img as any).compiledRunbook?.length || 0;
                    return (
                        <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-400 mt-1">
                            {pCount} PPL // {sCount} STG // {fCount} FLD // {aCount} AUTO
                        </p>
                    );
                  })()}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className={`px-2 py-1 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                    (img.runbookManifest || (img.compiledRunbook && img.compiledRunbook.length > 0)) ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-transparent'
                  }`}>
                    <span className={`h-1 w-1 rounded-full ${(img.runbookManifest || (img.compiledRunbook && img.compiledRunbook.length > 0)) ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                    {(img.runbookManifest || (img.compiledRunbook && img.compiledRunbook.length > 0)) ? "Automated" : "Static"}
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
                            setIsProcessing(true);
                            setTimeout(() => {
                              const exportData = {
                                ...img,
                                abCompiledObjects: img.compiledRunbook || img.abCompiledObjects || [],
                                compiledRunbook: img.compiledRunbook || img.abCompiledObjects || []
                              };
                              const blob = new Blob([serializeToRwe(exportData, exportData.compiledRunbook || [])], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${img.name.replace(/\s+/g, '-').toLowerCase()}.rwe`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              setOpenMenuId(null);
                              setIsProcessing(false);
                            }, 50);
                        }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-3"><i className="ti ti-download" /> Export</button>
                        <button onClick={() => deleteCard(img.id)} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-t border-zinc-200 dark:border-zinc-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-3"><i className="ti ti-trash" /> DELETE CARD</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

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
                Project Summary
              </button>
              <button 
                onClick={() => setDetailTab("guide")}
                className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all active:scale-95 ${detailTab === 'guide' ? 'border-[#004850] text-[#004850] dark:text-emerald-400' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
              >
                Automation Guide
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col relative p-6">
              <div className="flex items-center justify-between mb-4">
                {detailTab === 'json' && (
                  <button 
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-sm text-[9px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 transition-all active:scale-95"
                  >
                    <i className={`ti ${showRawJson ? 'ti-layout-list' : 'ti-code'}`} />
                    {showRawJson ? 'Switch to Overview' : 'View Raw JSON'}
                  </button>
                )}
                <div className="flex-1" />
                <button 
                  onClick={() => copyToClipboard(detailTab === 'json' ? JSON.stringify(activeDetail, null, 2) : activeDetail.runbookManifest || "")}
                  className="px-4 py-2 bg-[#004850] text-white rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-[#003840] transition-all flex items-center gap-2 active:scale-95"
                >
                  <i className="ti ti-copy" /> Copy Payload
                </button>
              </div>
              <div className="flex-1 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-6 overflow-y-auto">
                {/* ... existing detail view content ... */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUTO-BUILDER MODAL */}
      <AutoBuilderWizard
        abOpen={abOpen}
        setAbOpen={setAbOpen}
        abStep={abStep}
        setAbStep={setAbStep}
        images={images}
        setImages={setImages}
        abSelectedImageId={abSelectedImageId}
        setAbSelectedImageId={setAbSelectedImageId}
        abSelectedIntegrations={abSelectedIntegrations}
        setAbSelectedIntegrations={setAbSelectedIntegrations}
        abRoles={abRoles}
        setAbRoles={setAbRoles}
        abChatHistory={abChatHistory}
        setAbChatHistory={setAbChatHistory}
        visibleChatHistory={visibleChatHistory}
        setVisibleChatHistory={setVisibleChatHistory}
        abChatInput={abChatInput}
        setAbChatInput={setAbChatInput}
        isAiTyping={isAiTyping}
        setIsAiTyping={setIsAiTyping}
        abCompiledObjects={abCompiledObjects}
        setAbCompiledObjects={setAbCompiledObjects}
        abRoadmap={abRoadmap}
        setAbRoadmap={setAbRoadmap}
        abReviewFeedback={abReviewFeedback}
        setAbReviewFeedback={setAbReviewFeedback}
        staplingState={staplingState}
        setStaplingState={setStaplingState}
        isAttached={isAttached}
        setIsAttached={setIsAttached}
        isAutoFilling={isAutoFilling}
        setIsAutoFilling={setIsAutoFilling}
        abTelemetryGuesses={abTelemetryGuesses}
        setAbTelemetryGuesses={setAbTelemetryGuesses}
        isFetchingGuesses={isFetchingGuesses}
        setIsFetchingGuesses={setIsFetchingGuesses}
        setCopyFeedback={setCopyFeedback}
      />

      {/* FLOATING SUCCESS FEEDBACK */}
      {copyFeedback && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black px-6 py-3 rounded-sm font-mono text-[10px] font-black uppercase tracking-widest shadow-2xl z-[500] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10 dark:border-black/10">
          {copyFeedback}
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

interface AutoBuilderWizardProps {
  abOpen: boolean;
  setAbOpen: (open: boolean) => void;
  abStep: 'select' | 'preflight' | 'chat' | 'planning' | 'review' | 'stapling' | 'preview';
  setAbStep: (step: any) => void;
  images: LiveImage[];
  setImages: React.Dispatch<React.SetStateAction<LiveImage[]>>;
  abSelectedImageId: string | null;
  setAbSelectedImageId: (id: string | null) => void;
  abSelectedIntegrations: string[];
  setAbSelectedIntegrations: (integrations: string[]) => void;
  abRoles: { roleName: string; count: number }[] | any;
  setAbRoles: (roles: any) => void;
  abChatHistory: any[];
  setAbChatHistory: (history: any) => void;
  visibleChatHistory: any[];
  setVisibleChatHistory: (history: any) => void;
  abChatInput: string;
  setAbChatInput: (input: string) => void;
  isAiTyping: boolean;
  setIsAiTyping: (typing: boolean) => void;
  abCompiledObjects: any[];
  setAbCompiledObjects: (objects: any) => void;
  abRoadmap: any[];
  setAbRoadmap: (roadmap: any) => void;
  abReviewFeedback: string;
  setAbReviewFeedback: (feedback: string) => void;
  staplingState: { index: number; total: number; currentStage: string };
  setStaplingState: (state: any) => void;
  isAttached: boolean;
  setIsAttached: (attached: boolean) => void;
  isAutoFilling: boolean;
  setIsAutoFilling: (filling: boolean) => void;
  abTelemetryGuesses: Record<string, StageOperationalContext>;
  setAbTelemetryGuesses: (guesses: any) => void;
  isFetchingGuesses: boolean;
  setIsFetchingGuesses: (fetching: boolean) => void;
  setCopyFeedback: (feedback: string | null) => void;
}

function AutoBuilderWizard({
  abOpen,
  setAbOpen,
  abStep,
  setAbStep,
  images,
  setImages,
  abSelectedImageId,
  setAbSelectedImageId,
  abSelectedIntegrations,
  setAbSelectedIntegrations,
  abRoles,
  setAbRoles,
  abChatHistory,
  setAbChatHistory,
  visibleChatHistory,
  setVisibleChatHistory,
  abChatInput,
  setAbChatInput,
  isAiTyping,
  setIsAiTyping,
  abCompiledObjects,
  setAbCompiledObjects,
  abRoadmap,
  setAbRoadmap,
  abReviewFeedback,
  setAbReviewFeedback,
  staplingState,
  setStaplingState,
  isAttached,
  setIsAttached,
  isAutoFilling,
  setIsAutoFilling,
  abTelemetryGuesses,
  setAbTelemetryGuesses,
  isFetchingGuesses,
  setIsFetchingGuesses,
  setCopyFeedback,
}: AutoBuilderWizardProps) {
  const targetImage = images.find(img => img.id === abSelectedImageId);

  const updateStageTelemetry = (pIdx: number, sIdx: number, field: string, value: any) => {
    setImages(prev => prev.map(img => {
      if (img.id !== abSelectedImageId) return img;
      const pipelinesCopy = [...img.pipelines];
      const stagesCopy = [...pipelinesCopy[pIdx].stages];
      const stageCopy = { ...stagesCopy[sIdx] };
      const telemetryCopy = { ...((stageCopy as any).operational_telemetry || {}) };
      telemetryCopy[field] = value;
      (stageCopy as any).operational_telemetry = telemetryCopy;
      stagesCopy[sIdx] = stageCopy;
      pipelinesCopy[pIdx] = { ...pipelinesCopy[pIdx], stages: stagesCopy };
      return { ...img, pipelines: pipelinesCopy };
    }));
  };

  const acceptAllAIGuesses = () => {
    if (!abSelectedImageId) return;
    setImages(prev => prev.map(img => {
      if (img.id !== abSelectedImageId) return img;
      return {
        ...img,
        pipelines: img.pipelines.map(p => ({
          ...p,
          stages: p.stages.map(s => {
            const guesses = abTelemetryGuesses[s.name] || getLocalFallbackGuess(s.name);
            const tel = { ...(s.operational_telemetry || {}) } as any;
            if (!tel.targetDirective) tel.targetDirective = guesses.targetDirective;
            if (!tel.stuckThreshold) tel.stuckThreshold = guesses.stuckThreshold;
            return { ...s, operational_telemetry: tel };
          })
        }))
      };
    }));
  };

  const compileRawModelPromptManifest = (compiledObjects?: any[]) => {
    if (!targetImage) return "";
    const sanitizedIntegrations = abSelectedIntegrations.map(i => typeof i === 'object' ? (i as any).name || JSON.stringify(i) : i);
    const objArray = compiledObjects || abCompiledObjects;
    const markdown = objArray.map((o, idx) => {
      const coordinate = deriveAutomationCoordinate(o, idx, objArray, targetImage);
      return `### ${coordinate}: ${o.stageName}\nGoal: ${o.operationalGoal}\nSteps: ${o.setupSteps.join(', ')}`;
    }).join('\n\n---\n\n');
    return generateRunbookPrompt(targetImage, sanitizedIntegrations, { userRoles: abRoles, automationBlocks: markdown });
  };

  const compilePromptManifest = async (feedback?: string) => {
    if (!targetImage) return;

    if (abStep === 'select' || abStep === 'preflight' || abStep === 'chat' || (abStep === 'review' && feedback)) {
      setAbStep('planning');
      setIsAttached(false);

      try {
        const response = await fetch('/api/compile-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt: `You are a Master CRM Planner. Integrations: ${JSON.stringify(abSelectedIntegrations)}. Team: ${JSON.stringify(abRoles)}. ${feedback ? `Feedback: ${feedback}` : ""}`,
            userPrompt: `Blueprint: ${JSON.stringify(targetImage)}`,
            schema: { type: "OBJECT", properties: { roadmap: { type: "ARRAY", items: { type: "OBJECT", properties: { automationNumber: { type: "STRING" }, stageName: { type: "STRING" }, operationalGoal: { type: "STRING" } }, required: ["automationNumber", "stageName", "operationalGoal"] } } }, required: ["roadmap"] }
          })
        });

        const data = await response.json();
        if (data.success && data.jsonObject?.roadmap) {
          setAbRoadmap(data.jsonObject.roadmap);
          setAbStep('review');
        } else {
          setAbStep('chat');
        }
      } catch (error) {
        setAbStep('chat');
      }
      return;
    }

    if (abStep === 'review' && !feedback) {
      setAbStep('stapling');
      setStaplingState({ index: 0, total: abRoadmap.length, currentStage: "" });
      const newCompiledObjects: any[] = [];

      for (const [index, item] of abRoadmap.entries()) {
        setStaplingState({ index: index + 1, total: abRoadmap.length, currentStage: item.stageName });
        try {
          const response = await fetch('/api/compile-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemPrompt: `Enterprise Systems Architect. Goal: ${item.operationalGoal}`,
              userPrompt: `Blueprint Context: ${JSON.stringify(targetImage)}`
            })
          });
          const data = await response.json();
          if (data.success && data.jsonObject) {
            newCompiledObjects.push(data.jsonObject);
          } else {
            newCompiledObjects.push({ automationNumber: item.automationNumber, stageName: item.stageName, operationalGoal: item.operationalGoal, setupSteps: ["Error"] });
          }
        } catch (error) { console.error(error); }
      }
      setAbCompiledObjects(newCompiledObjects);
      setAbStep('preview');
    }
  };

  const handleDocxDownload = async () => {
    if (!abCompiledObjects || abCompiledObjects.length === 0 || !targetImage) return;
    const fileBlob = await exportRunbookToDocx(abCompiledObjects, targetImage.name);
    const downloadUrl = URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `process-guide-${abSelectedImageId}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
    setCopyFeedback("◆ Guide Downloaded (.docx)");
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleAiAutoFill = async () => {
    if (!targetImage) return;
    setIsAutoFilling(true);
    try {
      const response = await fetch('/api/compile-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'auto-fill', blueprint: targetImage })
      });
      const data = await response.json();
      if (data.success && data.jsonObject) {
        setAbChatInput(data.jsonObject.instruction || "");
      }
    } catch (e) { console.error(e); }
    setIsAutoFilling(false);
  };

  if (!abOpen) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-8 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl relative shadow-black/50">
        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-sm bg-[#004850] flex items-center justify-center text-white shadow-lg shadow-[#004850]/20">
              <i className={`ti ${abStep === 'select' ? 'ti-apps' : 'ti-wand'} text-xl`} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase font-mono">
                {abStep === 'select' ? "1. Select Project Track" : "Automation Builder"}
              </h2>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] mt-0.5">
                {abStep === 'select' ? "Generated via Gemini 3 Flash Preview" : "Conversational Process Architect // v1.2"}
              </p>
            </div>
          </div>
          <button onClick={() => setAbOpen(false)} className="h-10 w-10 flex items-center justify-center text-zinc-400 hover:text-rose-500 transition-colors">
            <i className="ti ti-x text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {abStep === 'select' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => { setAbSelectedImageId(img.id); setAbStep('preflight'); }}
                  className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-sm bg-zinc-50/50 dark:bg-zinc-900/50 hover:border-[#004850] dark:hover:border-emerald-500 transition-all text-left group active:scale-[0.98]"
                >
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-[#004850] dark:group-hover:text-emerald-400 transition-colors uppercase">{img.name}</h3>
                  <p className="text-[10px] text-zinc-400 mt-2 font-mono uppercase tracking-widest">
                    {img.pipelines?.length || 0} TRACKS // {img.pipelines?.reduce((acc, p) => acc + (p.stages?.length || 0), 0) || 0} STEPS
                  </p>
                </button>
              ))}
            </div>
          )}

          {abStep === 'preflight' && targetImage && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-sm">
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Verify step goals. Use AI suggestions to fill missing context.</p>
                <button onClick={acceptAllAIGuesses} className="px-4 py-2 bg-[#004850] text-white text-[9px] font-bold uppercase tracking-widest rounded-sm hover:bg-[#003840] transition-all">Accept All AI Suggestions</button>
              </div>
              <div className="space-y-8">
                {targetImage.pipelines.map((pipeline, pIdx) => (
                  <div key={pIdx} className="space-y-3">
                    <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                      <span>Track {pIdx + 1}: {pipeline.name}</span>
                      <span className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                    </div>
                    <table className="w-full text-left border-collapse border border-zinc-100 dark:border-zinc-800">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-900">
                          <th className="py-2 px-4 text-[9px] font-black uppercase text-zinc-400 w-1/4">Stage</th>
                          <th className="py-2 px-4 text-[9px] font-black uppercase text-zinc-400 w-1/2">Operational Goal</th>
                          <th className="py-2 px-4 text-[9px] font-black uppercase text-zinc-400 w-1/4">Threshold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pipeline.stages.map((stage, sIdx) => {
                          const tel = (stage as any).operational_telemetry || {};
                          const guesses = abTelemetryGuesses[stage.name] || getLocalFallbackGuess(stage.name);
                          return (
                            <tr key={sIdx} className="border-t border-zinc-100 dark:border-zinc-800">
                              <td className="py-3 px-4 text-xs font-bold uppercase text-zinc-900 dark:text-zinc-100">{stage.name}</td>
                              <td className="py-3 px-4">
                                <textarea
                                  value={tel.targetDirective || ""}
                                  onChange={e => updateStageTelemetry(pIdx, sIdx, "targetDirective", e.target.value)}
                                  placeholder={guesses.targetDirective}
                                  className="w-full bg-transparent border-none focus:ring-0 text-xs p-0 resize-none"
                                  rows={1}
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  value={tel.stuckThreshold || ""}
                                  onChange={e => updateStageTelemetry(pIdx, sIdx, "stuckThreshold", e.target.value)}
                                  placeholder={guesses.stuckThreshold}
                                  className="w-full bg-transparent border-none focus:ring-0 text-xs p-0"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
              <div className="pt-6 flex justify-end">
                <button onClick={() => setAbStep('chat')} className="px-8 py-3 bg-[#004850] text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-[#003840] transition-all">Continue to Configuration</button>
              </div>
            </div>
          )}

          {abStep === 'chat' && (
            <div className="h-full flex flex-col space-y-6">
              <div className="flex-1 overflow-y-auto space-y-4 pr-4">
                {abChatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-3 rounded-sm text-sm ${msg.sender === 'user' ? 'bg-[#004850] text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiTyping && <div className="text-[10px] font-mono animate-pulse uppercase text-zinc-400">AI is thinking...</div>}
              </div>
              <div className="relative">
                <textarea
                  value={abChatInput}
                  onChange={e => setAbChatInput(e.target.value)}
                  placeholder="Tell Gemini how to build your automations..."
                  className="w-full h-24 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-4 pr-32 text-sm focus:outline-none focus:border-[#004850] transition-all resize-none"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button 
                    onClick={handleAiAutoFill}
                    disabled={isAutoFilling}
                    className={`h-10 w-10 bg-zinc-100 dark:bg-zinc-800 text-[#004850] dark:text-emerald-500 rounded-sm flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 ${isAutoFilling ? 'animate-pulse' : ''}`}
                    title="AI Auto-fill"
                  >
                    <i className={`ti ${isAutoFilling ? 'ti-loader animate-spin' : 'ti-sparkles'} text-lg`} />
                  </button>
                  <button onClick={() => compilePromptManifest()} className="px-6 py-2 bg-[#004850] text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-[#003840] transition-all">Build Logic</button>
                </div>
              </div>
            </div>
          )}

          {abStep === 'planning' && (
            <div className="h-full flex flex-col items-center justify-center space-y-6">
              <div className="h-12 w-12 border-4 border-zinc-200 dark:border-zinc-800 border-t-[#004850] rounded-full animate-spin" />
              <h3 className="text-sm font-bold uppercase tracking-widest">Architecting Automation Roadmap...</h3>
            </div>
          )}

          {abStep === 'review' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {abRoadmap.map((item, i) => (
                  <div key={i} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-sm bg-zinc-50/50 dark:bg-zinc-900/50">
                    <span className="text-[10px] font-mono font-bold text-[#004850]">{item.automationNumber}</span>
                    <h4 className="text-xs font-bold uppercase mt-1">{item.stageName}</h4>
                    <p className="text-xs text-zinc-500 mt-2">{item.operationalGoal}</p>
                  </div>
                ))}
              </div>
              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-2">Revision Notes (Optional)</label>
                <textarea
                  value={abReviewFeedback}
                  onChange={e => setAbReviewFeedback(e.target.value)}
                  placeholder="e.g. 'Add Slack alert to stage 1'..."
                  className="w-full h-20 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-4 text-sm focus:outline-none focus:border-[#004850] transition-all resize-none"
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => compilePromptManifest(abReviewFeedback)} className="px-6 py-3 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">Request Revision</button>
                  <button onClick={() => compilePromptManifest()} className="px-6 py-3 bg-[#004850] text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-[#003840] transition-all">Approve & Finalize</button>
                </div>
              </div>
            </div>
          )}

          {abStep === 'stapling' && (
            <div className="h-full flex flex-col items-center justify-center space-y-8">
              <div className="w-full max-w-md bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-[#004850] h-full transition-all duration-500" style={{ width: `${(staplingState.index / staplingState.total) * 100}%` }} />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-2">Stapling Logic: {staplingState.currentStage}</h3>
                <p className="text-[10px] text-zinc-400 font-mono">{staplingState.index} / {staplingState.total} Blocks Processed</p>
              </div>
            </div>
          )}

          {abStep === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest">Process Blueprint Preview</h3>
                <div className="flex gap-2">
                  <button onClick={handleDocxDownload} className="px-4 py-2 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-widest rounded-sm hover:bg-blue-700 transition-all flex items-center gap-2"><i className="ti ti-file-text" /> Export Docx</button>
                  <button onClick={() => {
                    setImages(prev => prev.map(img => img.id === abSelectedImageId ? { ...img, compiledRunbook: abCompiledObjects, selectedIntegrations: abSelectedIntegrations } : img));
                    setIsAttached(true);
                    setCopyFeedback("◆ Process Attached to Card");
                    setTimeout(() => setCopyFeedback(null), 3000);
                  }} disabled={isAttached} className={`px-4 py-2 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all flex items-center gap-2 ${isAttached ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-[#004850] text-white hover:bg-[#003840]'}`}>
                    <i className={`ti ${isAttached ? 'ti-check' : 'ti-bookmark'}`} /> {isAttached ? "Attached" : "Attach to Card"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  {abCompiledObjects.map((item, i) => (
                    <div key={i} className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-sm bg-zinc-50/30">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 bg-zinc-900 text-white text-[8px] font-mono rounded-sm">{item.automationNumber}</span>
                        <span className="text-[10px] font-bold uppercase">{item.stageName}</span>
                      </div>
                      <p className="text-[11px] font-bold mb-2">{item.operationalGoal}</p>
                      <ul className="space-y-1">
                        {item.setupSteps?.map((step: string, si: number) => (
                          <li key={si} className="text-[10px] text-zinc-500 flex gap-2">
                            <span className="text-[#004850]">•</span> {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="bg-zinc-900 rounded-sm p-6 font-mono text-[10px] text-zinc-400 h-[500px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{compileRawModelPromptManifest()}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
