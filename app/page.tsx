// app/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { CRMArchitectureBlueprint, StageOperationalContext, PipelineStageSpec } from "@/types/blueprint";
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
  compiledRunbook?: any[];
  selectedIntegrations?: string[];
};

const generateRweId = () => "rwe_card_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);

// Fast local fallback heuristic — returns a targetDirective and stuckThreshold guess
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

// Async AI-powered guesser — fires a background call to Gemini and returns enriched telemetry
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
  // Fallback: build from local heuristics
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
        
        // Migrate legacy snake_case and split humanObjective/desiredOutcome into unified targetDirective
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

  // GLOBAL automation — cross-pipeline coordinate: G.0.Z
  if (itemPipelineId === "GLOBAL" || itemStageId === "GLOBAL") {
    const globalItems = runbook.filter((b: any) => b?.pipelineId === "GLOBAL" || b?.stageId === "GLOBAL");
    const globalRank = globalItems.findIndex((_: any, gi: number) => {
      // find which global item corresponds to this absolute index
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

  // Stage-anchored coordinate: P.S.Z
  // Find pipeline and stage indices
  if (!blueprint || !blueprint.pipelines) return `1.1.1`;
  let pIdx = -1;
  let sIdx = -1;

  for (let pi = 0; pi < blueprint.pipelines.length; pi++) {
    const pipeline = blueprint.pipelines[pi];
    const si = pipeline.stages.findIndex(s => s.name === stageName);
    if (si !== -1) { pIdx = pi; sIdx = si; break; }
  }

  if (pIdx === -1) return `1.1.1`;

  // Critical fix: count ONLY items sharing the exact same stageName up to and including this index
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
  const [abRoles, setAbRoles] = useState<{ roleName: string; count: number }[]>([]);
  const [abCompiledObjects, setAbCompiledObjects] = useState<any[]>([]);
  const [tempRoleLabel, setTempRoleLabel] = useState("");
  const [tempRoleSeats, setTempRoleSeats] = useState(1);
  const [isAttached, setIsAttached] = useState(false);
  const [abTelemetryGuesses, setAbTelemetryGuesses] = useState<Record<string, StageOperationalContext>>({});
  const [isFetchingGuesses, setIsFetchingGuesses] = useState(false);

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
    // For stage-anchored blocks: pick the first stage in the first pipeline as a starting anchor
    const firstPipeline = targetImg?.pipelines?.[0];
    const firstStage = firstPipeline?.stages?.[0];
    const isGlobal = mode === "global";
    setImages(prev => prev.map(img => img.id === detailId ? {
      ...img,
      compiledRunbook: [...(img.compiledRunbook || []), {
        automationNumber: "",  // derived at render time — never stored
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

  // Paste Importer States
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedConfig, setPastedConfig] = useState("");

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Import handler triggered");
    const file = e.target.files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
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
 
  const handlePasteImport = () => {
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
        setCopyFeedback("◆ Configuration imported successfully");
        setTimeout(() => setCopyFeedback(null), 3000);
      } else {
        throw new Error("Invalid configuration type");
      }
    } catch (e) {
      setUiModal({
        type: "alert",
        title: "Import Error",
        message: "Failed to parse configuration JSON. Ensure it is a valid .rwe export stream.",
        onCancel: () => setUiModal(null)
      });
    }
  };

  const compileRawModelPromptManifest = (compiledObjects?: any[]) => {
    const targetImage = images.find(i => i.id === abSelectedImageId);
    if (!targetImage) return "";
    const sanitizedIntegrations = abSelectedIntegrations.map(i => typeof i === 'object' ? (i as any).name || JSON.stringify(i) : i);
    
    const objArray = compiledObjects || abCompiledObjects;
    const markdown = objArray.map((o, idx) => {
      const coordinate = deriveAutomationCoordinate(o, idx, objArray, targetImage);
      return `### ${coordinate}: ${o.stageName}\nGoal: ${o.operationalGoal}\nSteps: ${o.setupSteps.join(', ')}`;
    }).join('\n\n---\n\n');
    
    return generateRunbookPrompt(targetImage, sanitizedIntegrations, { 
      userRoles: abRoles,
      automationBlocks: markdown
    });
  };

  const compilePromptManifest = async (feedback?: string) => {
    const targetImage = images.find(i => i.id === abSelectedImageId);
    if (!targetImage) return;

    // STAGE 1: Roadmap Generation (planning -> review)
    if (abStep === 'select' || abStep === 'preflight' || abStep === 'chat' || (abStep === 'review' && feedback)) {
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
            
            STRICT NAMING RULE: For each automation, the automationNumber MUST use the 3-digit coordinate pattern:
            - Stage-anchored blocks: "PipelineIndex.StageIndex.AutomationIndex" (e.g., "1.1.1", "1.1.2" for multiple automations in stage 1, "1.2.1", "2.1.1").
            - Global/account-wide blocks: "G.0.Z" (e.g., "G.0.1", "G.0.2") — these trigger across all pipelines and are not tied to any single stage.
            The first digit is Pipeline Index (1-based), second digit is Stage Index (1-based), and third digit is the sequential Automation Index (1-based) for that stage.
            
            CRITICAL ENRICHMENT DIRECTIVE:
            Analyze the 'operational_telemetry' object inside each stage of the blueprint:
            - If 'targetDirective' is set, construct a dedicated automation that operationalizes that directive — mapping it to concrete Pipedrive trigger/action steps.
            - If 'stuckThreshold' is set, you must generate a separate fallback automation for a Stalled Deal Alarm (e.g. "X.Y.2: Stalled Deal Alarm") that runs if a deal is stuck for longer than the threshold.
            - If 'routingDropdownKey' is set, you must generate a separate Multi-Branch Dropdown Router automation (e.g. "X.Y.3: Dropdown Option Router") mapping that custom field's options.
            - If 'isRecurringLoop' is true, you must generate a separate automation for a Looping/Recurring Activity.
            
            Therefore, instead of just 1 flat automation per stage, you must generate multiple distinct, rich operational automations per stage where these telemetry context parameters are present.
            
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
        
        // Find stage operational telemetry
        let stageTelemetry = null;
        let customFieldsList = targetImage.customFields || [];
        for (const pipeline of targetImage.pipelines) {
          const found = pipeline.stages.find(s => s.name === item.stageName);
          if (found) {
            stageTelemetry = (found as any).operational_telemetry;
            break;
          }
        }
        
        try {
          const response = await fetch('/api/compile-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemPrompt: `You are an Enterprise CRM Systems Architect. Capabilities: ${JSON.stringify(PIPEDRIVE_CAPABILITIES_REGISTRY)}. 
              Generate detailed configuration for the following roadmap item.
              STRICT NAMING RULE: automationNumber must remain "${item.automationNumber}".
              
              CRITICAL PATTERNS TO ENFORCE:
              
              Pattern A: Looping/Recurring State Machine
              - If the operational telemetry has 'isRecurringLoop' set to true, you MUST implement a self-sustaining activity loop.
              - The step-by-step layout MUST read: 'Trigger: Activity updated where subject matches [Name] and status matches DONE. Action: Instantly create a clean follow-up Activity with an identical subject line, natively mapped relative to the trigger execution timestamp with a relative delay offset of X days.' (where X is the recurrenceDays in telemetry).
              
              Pattern B: Multi-Branch Dropdown Router
              - If a 'routingDropdownKey' is specified in the operational telemetry, you are PROHIBITED from creating simple activity list reminders.
              - You must construct an explicit If/Else routing tree based entirely on the target field's valid options in the custom fields schema.
              - The step-by-step layout MUST read: 'Trigger: Deal custom field [Field Key] updates. Branching Conditions: If field matches Option A -> move Deal natively to Stage X. Else if field matches Option B -> move Deal natively to Stage Y.'`,
              userPrompt: `Generate configuration for automation goal: "${item.operationalGoal}" in stage "${item.stageName}".
              Roles involved: ${JSON.stringify(abRoles)}.
              Coordinate Index: ${item.automationNumber}
              
              Stage Operational Telemetry Context:
              ${stageTelemetry ? JSON.stringify(stageTelemetry, null, 2) : "None provided."}
              Custom Fields Schema:
              ${JSON.stringify(customFieldsList, null, 2)}`
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
    // Strip temporary manifests/prompt blocks before persistence to maintain snapshot purity
    const cleanImages = images.map(({ runbookManifest, ...img }) => img);
    localStorage.setItem('rw_workspace_cache', JSON.stringify(cleanImages));
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
            setImages(prev => [{ ...data.blueprint, id: generateRweId(), name: label, owner: "Live Ingest", deals: 0 }, ...prev]);
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
      title: "DELETE CARD",
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
        setImages(prev => [{ ...temporaryRollbackBackup, id: generateRweId(), name: label, owner: "Recovery Snapshot", deals: 0 }, ...prev]);
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
          <button
            onClick={() => setIsPasteModalOpen(true)}
            className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-sm flex items-center gap-2 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all active:scale-95"
          >
            <i className="ti ti-clipboard-check" /> PASTE CONFIG
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
                    <button onClick={() => setTelemetryLogs([])} className="font-mono text-[9px] font-bold uppercase text-rose-500 hover:text-rose-400">CLEAR LOGS</button>
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
                            <pre className="max-h-96 overflow-auto whitespace-pre font-mono text-[11px] bg-zinc-50 dark:bg-black p-3 text-zinc-600 dark:text-emerald-400/80 border-t border-zinc-200 dark:border-zinc-800">
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
                            const blob = new Blob([serializeToRwe(img, img.compiledRunbook || [])], { type: 'application/json' });
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
                {detailTab === 'json' ? (
                  showRawJson ? (
                    <pre className="font-mono text-[11px] text-zinc-700 dark:text-emerald-400/90 whitespace-pre-wrap leading-normal">
                      {JSON.stringify(activeDetail, null, 2)}
                    </pre>
                  ) : (
                    <div className="space-y-8 font-sans">
                      <div className="pb-6 border-b border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#004850] dark:text-emerald-500 mb-4">Engine Blueprint Overview</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Architecture</span>
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{activeDetail.name}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Version</span>
                            <span className="text-sm font-mono text-zinc-900 dark:text-zinc-100">{activeDetail.version}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Pipelines</span>
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{activeDetail.pipelines?.length || 0}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Stages</span>
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              {activeDetail.pipelines?.reduce((acc: number, p: any) => acc + (p.stages?.length || 0), 0) || 0}
                            </span>
                          </div>
                        </div>
                        {activeDetail.description && (
                          <div className="mt-6">
                            <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Architectural Intent</span>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic">
                              "{activeDetail.description}"
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Workflow Structures</h3>
                        <div className="space-y-4">
                          {activeDetail.pipelines?.map((pipeline: any, pIdx: number) => (
                            <div key={pIdx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                                  {pIdx + 1}. {pipeline.name}
                                </span>
                                <span className="font-mono text-[9px] text-zinc-400 tracking-widest">
                                  {pipeline.stages?.length || 0} STAGES
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {pipeline.stages?.map((stage: any, sIdx: number) => (
                                  <div key={sIdx} className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-sm text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                                    {stage.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {activeDetail.customFields && activeDetail.customFields.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Data Schema Extension</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {activeDetail.customFields.map((field: any, fIdx: number) => (
                              <div key={fIdx} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm">
                                <div className="h-8 w-8 rounded-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-400">
                                  <i className="ti ti-table-column" />
                                </div>
                                <div>
                                  <span className="block text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[180px]">{field.name}</span>
                                  <span className="block font-mono text-[9px] text-zinc-400 uppercase tracking-widest">{field.type} · {field.field_type}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ) : activeDetail.compiledRunbook && activeDetail.compiledRunbook.length > 0 ? (() => {
                  const runbook: any[] = activeDetail.compiledRunbook || [];
                  const palette = [
                    { border: 'border-[#008080]', text: 'text-[#008080]', bg: 'bg-[#008080]/5' },
                    { border: 'border-[#000080]', text: 'text-[#000080]', bg: 'bg-[#000080]/5' },
                    { border: 'border-[#006400]', text: 'text-[#006400]', bg: 'bg-[#006400]/5' },
                    { border: 'border-[#4B0082]', text: 'text-[#4B0082]', bg: 'bg-[#4B0082]/5' }
                  ];

                  const globalEntries = runbook
                    .map((item: any, i: number) => ({ item, i }))
                    .filter(({ item }) => item.stageName === "GLOBAL" || item.pipelineId === "GLOBAL" || item.stageId === "GLOBAL");

                  const stageEntries = runbook
                    .map((item: any, i: number) => ({ item, i }))
                    .filter(({ item }) => item.stageName !== "GLOBAL" && item.pipelineId !== "GLOBAL" && item.stageId !== "GLOBAL");

                  const renderBlock = (item: any, i: number) => {
                    const isGlobalBlock = item.stageName === "GLOBAL" || item.pipelineId === "GLOBAL" || item.stageId === "GLOBAL";
                    const theme = palette[i % 4];
                    return (
                      <div key={i} className={`border ${isGlobalBlock ? 'border-violet-400 dark:border-violet-700' : theme.border} rounded-sm overflow-hidden bg-white dark:bg-zinc-900 shadow-none`}>
                        {/* Block Header */}
                        <div className={`px-4 py-3 ${isGlobalBlock ? 'bg-violet-50/60 dark:bg-violet-950/20 border-b border-violet-200 dark:border-violet-800' : `${theme.bg} border-b ${theme.border}`} flex items-center gap-3`}>
                          <span className={`shrink-0 font-mono text-[10px] font-black px-2 py-0.5 rounded-sm tracking-widest ${isGlobalBlock ? 'bg-violet-600 text-white' : 'bg-zinc-900 dark:bg-white text-white dark:text-black'}`}>
                            {deriveAutomationCoordinate(item, i, runbook, activeDetail)}
                          </span>
                          <select
                            value={isGlobalBlock ? "GLOBAL" : (item.stageName || "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "GLOBAL") {
                                updateRunbookObjectField(i, 'stageName', 'GLOBAL');
                                updateRunbookObjectField(i, 'pipelineId', 'GLOBAL');
                                updateRunbookObjectField(i, 'stageId', 'GLOBAL');
                              } else {
                                updateRunbookObjectField(i, 'stageName', val);
                                updateRunbookObjectField(i, 'pipelineId', undefined);
                                updateRunbookObjectField(i, 'stageId', undefined);
                              }
                            }}
                            className={`flex-1 min-w-0 bg-transparent border-b text-xs font-bold uppercase tracking-tight outline-none appearance-none cursor-pointer truncate ${isGlobalBlock ? 'border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-400' : `${theme.text} border-zinc-200 dark:border-zinc-700`}`}
                          >
                            <option value="GLOBAL" className="dark:bg-zinc-950 font-sans normal-case font-normal">⬡ GLOBAL (Account-Wide)</option>
                            {activeDetail.pipelines?.flatMap((pipeline: any, pIdx: number) =>
                              pipeline.stages?.map((stage: any, sIdx: number) => (
                                <option key={`${pIdx}-${sIdx}`} value={stage.name} className="dark:bg-zinc-950 font-sans normal-case font-normal">
                                  {pIdx + 1}.{sIdx + 1} — {stage.name}
                                </option>
                              ))
                            )}
                          </select>
                          <div className="shrink-0 flex items-center gap-3">
                            <div className="flex items-center gap-1 border-r border-zinc-200 dark:border-zinc-800 pr-3">
                              <button onClick={() => moveAutomationBlockUp(i)} className="h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors text-[10px] active:scale-95" title="Move Up">▲</button>
                              <button onClick={() => moveAutomationBlockDown(i)} className="h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors text-[10px] active:scale-95" title="Move Down">▼</button>
                            </div>
                            <button onClick={() => handleDeleteAutomationBlock(i)} className="text-zinc-400 hover:text-rose-500 transition-colors active:scale-95"><i className="ti ti-trash" /></button>
                          </div>
                        </div>

                        <div className="p-6 space-y-6">
                          <div>
                            <input
                              value={item.operationalGoal}
                              onChange={(e) => updateRunbookObjectField(i, 'operationalGoal', e.target.value)}
                              className="w-full bg-transparent border-b border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 outline-none py-1 text-sm font-bold text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-mono text-[10px] font-black uppercase tracking-widest text-zinc-400">Impacted Personnel</h4>
                            <input
                              value={(item.impactedRoles || []).join(', ')}
                              onChange={(e) => updateRunbookObjectField(i, 'impactedRoles', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                              placeholder="Role A, Role B, Role C..."
                              className="w-full bg-transparent border-b border-zinc-100 dark:border-zinc-800 focus:border-zinc-400 outline-none py-1 text-sm text-zinc-700 dark:text-zinc-300"
                            />
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-mono text-[10px] font-black uppercase tracking-widest text-zinc-400">Setup Cadence</h4>
                            <ol className="list-decimal pl-5 font-sans text-xs tracking-normal text-zinc-700 dark:text-zinc-300 space-y-2">
                              {item.setupSteps.map((step: string, idx: number) => (
                                <li key={idx} className="pl-2 flex items-center gap-2">
                                  <input
                                    value={step}
                                    onChange={(e) => {
                                      const newSteps = [...item.setupSteps];
                                      newSteps[idx] = e.target.value;
                                      updateRunbookObjectField(i, 'setupSteps', newSteps);
                                    }}
                                    className="w-full bg-transparent border-b border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 outline-none py-1"
                                  />
                                  <button onClick={() => handleDeleteCadenceStep(i, idx)} className="text-zinc-400 hover:text-rose-500"><i className="ti ti-trash text-[10px]" /></button>
                                </li>
                              ))}
                            </ol>
                            <button onClick={() => handleAddCadenceStep(i)} className="text-[10px] font-mono font-bold text-[#004850] dark:text-zinc-400 hover:underline cursor-pointer mt-2 block">
                              + ADD NEXT CADENCE STEP
                            </button>
                          </div>
                          {item.governanceNotes && (
                            <div className="mt-6 border-l-2 border-amber-500 bg-amber-500/5 p-4 rounded-sm flex gap-3 items-start animate-in fade-in slide-in-from-left-2 duration-300">
                              <i className="ti ti-info-circle text-amber-600 mt-0.5" />
                              <div className="flex-1">
                                <textarea
                                  value={item.governanceNotes || ""}
                                  onChange={(e) => updateRunbookObjectField(i, 'governanceNotes', e.target.value)}
                                  className="w-full bg-transparent outline-none text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed resize-none"
                                  rows={3}
                                />
                              </div>
                              <button onClick={() => updateRunbookObjectField(i, 'governanceNotes', "")} className="text-[9px] font-bold uppercase tracking-widest text-amber-600 hover:text-amber-700 border border-amber-600/20 px-2 py-1 rounded-sm transition-colors active:scale-95">
                                [OMIT NOTES]
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-6 font-sans">
                      {/* ── GLOBAL AUTOMATION SHELF ─────────────────────── */}
                      {globalEntries.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 px-1">
                            <span className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-violet-500">⬡ Global Automations</span>
                            <span className="flex-1 h-px bg-violet-200 dark:bg-violet-900" />
                            <span className="font-mono text-[9px] text-violet-400 tracking-widest">{globalEntries.length} block{globalEntries.length > 1 ? 's' : ''} · fires account-wide</span>
                          </div>
                          <div className="space-y-4">
                            {globalEntries.map(({ item, i }) => renderBlock(item, i))}
                          </div>
                        </div>
                      )}

                      {/* ── STAGE-ANCHORED BLOCKS ────────────────────────── */}
                      {stageEntries.length > 0 && (
                        <div className="space-y-3">
                          {globalEntries.length > 0 && (
                            <div className="flex items-center gap-3 px-1">
                              <span className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">Stage Automations</span>
                              <span className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                            </div>
                          )}
                          <div className="space-y-8">
                            {stageEntries.map(({ item, i }) => renderBlock(item, i))}
                          </div>
                        </div>
                      )}

                      {/* ── ADD BUTTONS ──────────────────────────────────── */}
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => handleAddNewManualBlock('stage')} className="flex-1 py-3 border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500 transition-all font-mono text-[10px] font-bold uppercase tracking-widest active:scale-[0.99]">
                          + Add Stage Block
                        </button>
                        <button onClick={() => handleAddNewManualBlock('global')} className="flex-1 py-3 border border-dashed border-violet-300 dark:border-violet-800 text-violet-500 hover:text-violet-800 dark:hover:text-violet-300 hover:border-violet-500 transition-all font-mono text-[10px] font-bold uppercase tracking-widest active:scale-[0.99]">
                          ⬡ Add Global Block
                        </button>
                      </div>
                    </div>
                  );
                })()
                : (
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

      {/* 8. PASTE CONFIG MODAL */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[350] flex items-center justify-center p-8 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm w-full max-w-2xl h-[60vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="px-6 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between bg-white dark:bg-zinc-900">
              <h3 className="font-bold uppercase text-[10px] tracking-widest text-[#004850] dark:text-emerald-500">PASTE CONFIGURATION STREAM</h3>
              <button onClick={() => setIsPasteModalOpen(false)} className="h-8 w-8 rounded-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center text-zinc-400">
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="flex-1 p-6 flex flex-col gap-4">
              <textarea 
                value={pastedConfig}
                onChange={(e) => setPastedConfig(e.target.value)}
                placeholder="Paste your raw .rwe configuration JSON text stream here..."
                className="flex-1 w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-sm p-4 font-mono text-xs focus:outline-none focus:border-zinc-400 transition-all resize-none"
              />
              <button 
                onClick={handlePasteImport}
                className="w-full py-3 bg-[#004850] text-white rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-[#003840] transition-all active:scale-95"
              >
                IMPORT CONFIG DATA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTOMATION BUILDER MODAL */}
      {abOpen && (() => {
        const targetImage = images.find(img => img.id === abSelectedImageId);
        
        // Helper to update stage operational telemetry
        const updateStageTelemetry = (
          pipelineIdx: number,
          stageIdx: number,
          field: string,
          value: any
        ) => {
          if (!abSelectedImageId) return;
          setImages(prev => prev.map(img => {
            if (img.id !== abSelectedImageId) return img;
            const pipelinesCopy = [...img.pipelines];
            const stagesCopy = [...pipelinesCopy[pipelineIdx].stages];
            const stageCopy = { ...stagesCopy[stageIdx] };
            const telemetryCopy = { ...((stageCopy as any).operational_telemetry || {}) };
            telemetryCopy[field] = value;
            (stageCopy as any).operational_telemetry = telemetryCopy;
            stagesCopy[stageIdx] = stageCopy;
            pipelinesCopy[pipelineIdx] = { ...pipelinesCopy[pipelineIdx], stages: stagesCopy };
            return { ...img, pipelines: pipelinesCopy };
          }));
        };

        // Helper to accept all AI-guessed telemetries
        const acceptAllAIGuesses = () => {
          if (!abSelectedImageId) return;
          setImages(prev => prev.map(img => {
            if (img.id !== abSelectedImageId) return img;
            const pipelinesCopy = img.pipelines.map((pipeline) => {
              const stagesCopy = pipeline.stages.map((stage) => {
                const telemetryCopy = { ...(stage.operational_telemetry || {}) } as any;
                // Use live AI guesses from background fetch; fall back to local heuristic
                const guesses: StageOperationalContext = abTelemetryGuesses[stage.name] || getLocalFallbackGuess(stage.name);

                if (!telemetryCopy.targetDirective) telemetryCopy.targetDirective = guesses.targetDirective;
                if (!telemetryCopy.stuckThreshold) telemetryCopy.stuckThreshold = guesses.stuckThreshold;
                if (telemetryCopy.isRecurringLoop === undefined) telemetryCopy.isRecurringLoop = guesses.isRecurringLoop ?? false;
                if (telemetryCopy.recurrenceDays === undefined) telemetryCopy.recurrenceDays = guesses.recurrenceDays ?? 7;

                return {
                  ...stage,
                  operational_telemetry: telemetryCopy
                };
              });
              return { ...pipeline, stages: stagesCopy };
            });
            return { ...img, pipelines: pipelinesCopy };
          }));
        };

        return (
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
              <div className={`mx-auto w-full px-6 transition-all duration-300 ${abStep === 'preflight' ? 'max-w-5xl' : 'max-w-3xl'}`}>
                  
                  {/* Pre-Flight Context Matrix Screen */}
                  {abStep === 'preflight' && (() => {
                    if (!targetImage) return null;

                    return (
                      <div className="py-6 space-y-6 animate-in fade-in duration-300 font-sans">
                        {/* Header section with description and Accept All Guesses */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                          <div>
                            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 font-mono tracking-tight uppercase">
                              Pre-Flight Context Matrix
                            </h2>
                            <p className="text-xs text-zinc-500 mt-1 font-sans">
                              Define real-world telemetry parameters for each pipeline stage. Ghost text shows AI-guessed context; press <kbd className="px-1.5 py-0.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-850 rounded font-mono text-[9px] text-zinc-800 dark:text-zinc-200">Tab</kbd> inside an empty field to accept it.
                            </p>
                          </div>
                          <button
                            onClick={acceptAllAIGuesses}
                            className="shrink-0 h-9 px-4 flex items-center justify-center gap-2 border border-[#004850]/20 hover:border-[#004850] bg-[#004850]/5 hover:bg-[#004850]/15 text-[#004850] dark:text-[#008080] rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                          >
                            [Accept All AI Guesses]
                          </button>
                        </div>

                        {/* Grid container */}
                        <div className="space-y-8">
                          {targetImage.pipelines.map((pipeline, pIdx) => (
                            <div key={pIdx} className="space-y-4">
                              <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                <span>Pipeline {pIdx + 1}: {pipeline.name}</span>
                                <span className="flex-1 h-[1px] bg-zinc-200 dark:bg-zinc-800" />
                              </div>

                              <div className="border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden bg-white dark:bg-zinc-900">
                                <table className="w-full text-left border-collapse table-fixed">
                                  <thead>
                                    <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                                      <th className="py-3 px-4 w-44">Stage</th>
                                      <th className="py-3 px-4">Target Directive {isFetchingGuesses && <span className="text-indigo-400 animate-pulse">⟳ AI</span>}</th>
                                      <th className="py-3 px-4 w-32">Stalled Threshold</th>
                                      <th className="py-3 px-4 w-48">Router Config</th>
                                      <th className="py-3 px-4 w-48">Loop Activity</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {pipeline.stages.map((stage, sIdx) => {
                                      const telemetry: StageOperationalContext = (stage.operational_telemetry as StageOperationalContext) || {
                                        targetDirective: "",
                                        stuckThreshold: "",
                                        routingDropdownKey: "",
                                        isRecurringLoop: false,
                                        recurrenceDays: 7
                                       };
                                       const guesses: StageOperationalContext = abTelemetryGuesses[stage.name] || getLocalFallbackGuess(stage.name);

                                       return (
                                         <tr key={sIdx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 text-xs transition-colors">
                                           {/* Stage Name Column */}
                                           <td className="py-4 px-4 align-top">
                                             <span className="font-mono text-[10px] font-bold text-zinc-400 block">STAGE {pIdx + 1}.{sIdx + 1}</span>
                                             <span className="font-bold text-zinc-900 dark:text-zinc-100 block tracking-tight truncate" title={stage.name}>
                                               {stage.name}
                                             </span>
                                           </td>

                                           {/* Target Directive Column — merged objective + outcome */}
                                           <td className="py-3 px-3 align-top">
                                             <textarea
                                               value={telemetry.targetDirective || ""}
                                               onChange={(e) => updateStageTelemetry(pIdx, sIdx, "targetDirective", e.target.value)}
                                               onKeyDown={(e) => {
                                                 if (e.key === 'Tab' && !telemetry.targetDirective) {
                                                   e.preventDefault();
                                                   updateStageTelemetry(pIdx, sIdx, "targetDirective", guesses.targetDirective || "");
                                                 }
                                               }}
                                               placeholder={guesses.targetDirective || "Describe what this stage does and what success looks like..."}
                                               rows={3}
                                               className="w-full bg-transparent border-b border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 outline-none p-1 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-300 dark:placeholder-zinc-700/80 resize-none leading-normal transition-all"
                                             />
                                             {!telemetry.targetDirective && guesses.targetDirective && (
                                               <button
                                                 onClick={() => updateStageTelemetry(pIdx, sIdx, "targetDirective", guesses.targetDirective || "")}
                                                 className="text-[9px] font-mono text-indigo-400 hover:text-indigo-600 transition-colors mt-0.5"
                                               >
                                                 Tab to accept
                                               </button>
                                             )}
                                           </td>

                                          {/* Stuck Threshold Column */}
                                          <td className="py-3 px-3 align-top">
                                            <input
                                              value={telemetry.stuckThreshold || ""}
                                              onChange={(e) => updateStageTelemetry(pIdx, sIdx, "stuckThreshold", e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Tab' && !telemetry.stuckThreshold) {
                                                  updateStageTelemetry(pIdx, sIdx, "stuckThreshold", guesses.stuckThreshold);
                                                }
                                              }}
                                              placeholder={guesses.stuckThreshold}
                                              className="w-full bg-transparent border-b border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 outline-none p-1 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-300 dark:placeholder-zinc-700/80 font-mono tracking-tight transition-all"
                                            />
                                          </td>

                                          {/* Router Config Column */}
                                          <td className="py-3 px-3 align-top space-y-1">
                                            <div className="flex items-center gap-1.5">
                                              <i className="ti ti-git-fork text-zinc-400 text-xs shrink-0" />
                                              <select
                                                value={telemetry.routingDropdownKey || ""}
                                                onChange={(e) => updateStageTelemetry(pIdx, sIdx, "routingDropdownKey", e.target.value || undefined)}
                                                className="w-full bg-transparent border-b border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 focus:border-zinc-400 outline-none py-1 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 select-none appearance-none cursor-pointer"
                                              >
                                                <option value="" className="dark:bg-zinc-950">[No Router Field]</option>
                                                {(targetImage?.customFields || [])
                                                  .filter(f => f.type === 'enum' || f.type === 'set' || f.type === 'text' || f.type === 'varchar')
                                                  .map(field => (
                                                    <option key={field.key} value={field.key} className="dark:bg-zinc-950">
                                                      {field.name} ({field.key})
                                                    </option>
                                                  ))}
                                              </select>
                                            </div>
                                            {telemetry.routingDropdownKey && (() => {
                                              const matchedField = (targetImage?.customFields || []).find(f => f.key === telemetry.routingDropdownKey);
                                              if (matchedField?.options) {
                                                return (
                                                  <div className="text-[9px] font-mono text-zinc-400 pl-4 space-y-0.5 truncate">
                                                    <span>Options: {matchedField.options.map(o => o.label).join(' | ')}</span>
                                                  </div>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </td>

                                          {/* Looping Recurrence Switch Column */}
                                          <td className="py-3 px-3 align-top space-y-2">
                                            <button
                                              onClick={() => updateStageTelemetry(pIdx, sIdx, "isRecurringLoop", !telemetry.isRecurringLoop)}
                                              className={`w-full py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-all active:scale-95 ${
                                                telemetry.isRecurringLoop
                                                  ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400'
                                                  : 'bg-zinc-50 border-zinc-200 dark:bg-zinc-800/30 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600'
                                              }`}
                                            >
                                              {telemetry.isRecurringLoop ? '[LOOP: ACTIVE]' : '[LOOP ACTIVITY]'}
                                            </button>
                                            {telemetry.isRecurringLoop && (
                                              <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                                                <span className="text-[9px] font-mono text-zinc-400 shrink-0">Delay:</span>
                                                <input
                                                  type="number"
                                                  min={1}
                                                  max={90}
                                                  value={telemetry.recurrenceDays || 7}
                                                  onChange={(e) => updateStageTelemetry(pIdx, sIdx, "recurrenceDays", parseInt(e.target.value) || 7)}
                                                  className="w-12 bg-transparent border-b border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 outline-none text-center font-mono text-[10px] text-zinc-800 dark:text-zinc-200"
                                                />
                                                <span className="text-[9px] font-mono text-zinc-400 shrink-0">days</span>
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer controls: Confirm Matrix */}
                        <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
                          <button
                            onClick={() => {
                              // Confirm pre-flight telemetry, fill chat history and progress
                              setAbChatHistory([
                                { sender: "ai", text: `Let's customize your native automation runbook layout. First, select an active configuration blueprint card to analyze.` },
                                { sender: "user", text: `Analyze blueprint: ${targetImage?.name}` },
                                { sender: "ai", text: "Excellent! The CRM Stage Operational Telemetry Matrix has been injected successfully. Who will be using this CRM workspace? Let's build your team registry and assign seat counts." }
                              ]);
                              setAbStep('chat');
                            }}
                            className="h-12 px-8 bg-zinc-950 hover:bg-zinc-900 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black rounded-sm text-[10px] font-bold uppercase tracking-[0.2em] transition-all active:scale-95 shadow-md"
                          >
                            Confirm Context Matrix
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* History Messages */}
                  {abStep !== 'preflight' && abChatHistory.map((msg, i) => (
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
                          setAbStep('preflight');
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
              {abStep === 'review' && (() => {
                const renderingSource = abRoadmap.length > 0 ? abRoadmap : abCompiledObjects;
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Roadmap Validation</span>
                      <span className="font-mono text-[10px] text-zinc-400 italic">
                        Review {renderingSource.length} items
                      </span>
                    </div>
                    <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-sm bg-white dark:bg-zinc-900 max-h-[45vh] overflow-y-auto pr-1">
                      {(() => {
                        const activeItems = abRoadmap && abRoadmap.length > 0 ? abRoadmap : (abCompiledObjects || []);
                        return activeItems.map((item: any, i: number) => (
                          <div key={i} className="border-b border-zinc-200/60 dark:border-zinc-800/60 py-3 last:border-b-0 px-4">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs tracking-tight">
                              {deriveAutomationCoordinate(item, i, activeItems, targetImage)}: {item.stageName}
                            </span>
                            <p className="text-xs text-zinc-500 font-sans mt-0.5">
                              {item.operationalGoal}
                            </p>
                          </div>
                        ));
                      })()}
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
                );
              })()}

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
                        setImages(prev => prev.map(img => img.id === abSelectedImageId ? { ...img, runbookManifest: payload, compiledRunbook: abCompiledObjects } : img));
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
      )})()}

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
      <input type="file" id="rwe-import-input" accept=".rwe" className="hidden" onChange={handleImport} />

    </div>
  );
}
