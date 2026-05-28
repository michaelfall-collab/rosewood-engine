// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { CRMArchitectureBlueprint } from "@/types/blueprint";

// Mock data populated using standard industry template frameworks from the POC
const INITIAL_IMAGES: (CRMArchitectureBlueprint & { owner: string; deals: number; automationInstructions?: string })[] = [
  {
    id: "img_001",
    version: "2.1.0",
    name: "Shed Builders Core Pipeline",
    description: "Standard sales pipeline configured specifically for custom outdoor storage structures.",
    owner: "Trent",
    deals: 14,
    pipelines: [
      {
        name: "Lead to Waitlist",
        order_nr: 1,
        deal_probability: true,
        stages: [
          { name: "New Lead", order_nr: 1, deal_probability: 100, rotten_flag: false, rotten_days: null },
          { name: "Contacted", order_nr: 2, deal_probability: 80, rotten_flag: true, rotten_days: 3 },
          { name: "Qualified", order_nr: 3, deal_probability: 50, rotten_flag: false, rotten_days: null },
          { name: "Proposal Sent", order_nr: 4, deal_probability: 20, rotten_flag: true, rotten_days: 7 }
        ]
      }
    ],
    automationInstructions: "TRIGGER: New deal created\nACTION: Send welcome email via Gmail\nACTION: Post to Slack #new-leads\nCONDITION: stage=Contacted → notify account manager\nACTION: Add to nurture sequence"
  },
  {
    id: "img_002",
    version: "1.0.4",
    name: "Metal Sales Base Setup",
    description: "Opinionated flow engineered for fast-paced roll-forming and metal panel manufacturing orders.",
    owner: "Andrew",
    deals: 8,
    pipelines: [
      {
        name: "Waitlist to Onboarding",
        order_nr: 1,
        deal_probability: true,
        stages: [
          { name: "Waitlist Entry", order_nr: 1, deal_probability: 100, rotten_flag: false, rotten_days: null },
          { name: "Nurture Touch", order_nr: 2, deal_probability: 90, rotten_flag: false, rotten_days: null },
          { name: "Capacity Check", order_nr: 3, deal_probability: 60, rotten_flag: false, rotten_days: null },
          { name: "Ready to Onboard", order_nr: 4, deal_probability: 10, rotten_flag: false, rotten_days: null }
        ]
      }
    ],
    automationInstructions: undefined
  },
  {
    id: "img_003",
    version: "3.0.1",
    name: "Onboarded Client Lifecycle",
    description: "Tracking engine designed to monitor client relationship health during the first 90 days.",
    owner: "Carla",
    deals: 22,
    pipelines: [
      {
        name: "Onboarded Client Flow",
        order_nr: 1,
        deal_probability: true,
        stages: [
          { name: "Welcome Pack", order_nr: 1, deal_probability: 100, rotten_flag: false, rotten_days: null },
          { name: "Month 1 Review", order_nr: 2, deal_probability: 100, rotten_flag: false, rotten_days: null },
          { name: "Month 2 Sync", order_nr: 3, deal_probability: 100, rotten_flag: false, rotten_days: null },
          { name: "Month 3 Transition", order_nr: 4, deal_probability: 100, rotten_flag: false, rotten_days: null }
        ]
      }
    ],
    automationInstructions: undefined
  }
];

const INTEGRATIONS = ["Slack", "Trello", "Webhooks", "Gmail", "Google Sheets", "Zapier", "Notion", "HubSpot"];
const INTEG_ICONS: Record<string, string> = {
  Slack: "ti-brand-slack", Trello: "ti-brand-trello", Webhooks: "ti-webhook", Gmail: "ti-mail",
  "Google Sheets": "ti-table", Zapier: "ti-bolt", Notion: "ti-notebook", HubSpot: "ti-building-store"
};

export default function ImageCockpitDashboard() {
  // Global State Machine
  const [images, setImages] = useState(INITIAL_IMAGES);
  const [apiKey, setApiKey] = useState("");
  const [flashMode, setFlashMode] = useState<"" | "pipedrive" | "rosewood">("");
  const [viewLayout, setViewLayout] = useState<"grid" | "list">("grid");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

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

  // Automation Builder State (AI Two-Pass Space)
  const [abOpen, setAbOpen] = useState(false);
  const [abStep, setAbStep] = useState<"select" | "chat" | "building" | "preview" | "done" | "attach">("select");
  const [abTargetId, setAbTargetId] = useState<string | null>(null);
  const [abSelectedIntegs, setAbSelectedIntegs] = useState<string[]>([]);
  const [abPreviewItems, setAbPreviewItems] = useState<{ id: string; name: string; desc: string }[]>([]);
  const [abIsConfirmed, setAbIsConfirmed] = useState(false);

  // Global click closer for dropdown menus
  useEffect(() => {
    const handleGlobalClose = () => setOpenMenuId(null);
    window.addEventListener("click", handleGlobalClose);
    return () => window.removeEventListener("click", handleGlobalClose);
  }, []);

  const activeDetailItem = images.find((i) => i.id === detailId);

  // Dropdown Option Command Matrix
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

  // Execution Handlers
  const confirmFlashOutbound = () => {
    setConfirmType(null);
    setFlashMode("");
    alert("✓ System Setup successfully flashed directly into the connected Pipedrive API Token environment!");
  };

  const confirmDeleteImage = () => {
    setImages(images.filter((img) => img.id !== confirmTargetId));
    setConfirmType(null);
    if (detailId === confirmTargetId) setDetailId(null);
  };

  const handleInboundCapture = (action: "new" | "overwrite") => {
    setConfirmType(null);
    if (action === "new") {
      const name = prompt("Enter a plain-language label for this Captured Image Snapshot:");
      if (!name) return;
      const newImg = {
        id: `img_${Date.now()}`,
        version: "1.0.0",
        name: name,
        description: "Programmatically captured system configuration state.",
        owner: "Admin",
        deals: 0,
        pipelines: [{ name: "Inbound Capture Pipeline", order_nr: 1, deal_probability: true, stages: [] }]
      } as any;
      setImages([newImg, ...images]);
      alert("✓ Captured system setup successfully committed into the Rosewood Vault.");
    } else {
      alert("✓ Target setup card overwritten with fresh configuration metrics.");
    }
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
      alert("Please toggle the confirmation verification gate layout block first.");
      return;
    }
    setAbStep("done");
  };

  const bindAiInstructionsToTemplate = (attach: boolean) => {
    if (attach) {
      const formattedInstructions = abPreviewItems.map((p) => `[${p.id}] Naming: ${p.name}\nDescription: ${p.desc}`).join("\n\n");
      setImages(images.map((img) => img.id === abTargetId ? { ...img, automationInstructions: formattedInstructions } : img));
      alert("✓ Structured instruction recipe attached to template card.");
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
          <span className="font-semibold text-sm tracking-tight">Rosewood CRM Engine</span>
          <button 
            onClick={() => { setAbOpen(true); setAbStep("select"); }}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
          >
            <i className="ti ti-wand text-xs" /> Automation builder
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <i className="ti ti-key text-xs text-slate-400 absolute left-3" />
            <input 
              type="password" 
              placeholder="Pipedrive API Token (sk-pd-••••)" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-52 pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-mono tracking-wider focus:outline-none focus:border-emerald-500"
            />
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
                <div 
                  onClick={() => { setFlashMode("pipedrive"); setOpenMenuId(null); }}
                  className="px-4 py-2.5 cursor-pointer text-xs flex items-center gap-2 bg-emerald-50/40 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-b border-slate-100 dark:border-zinc-900"
                >
                  <i className="ti ti-bolt" /> → to Pipedrive account
                </div>
                <div 
                  onClick={() => { setConfirmType("fromPipedrive"); setOpenMenuId(null); }}
                  className="px-4 py-2.5 cursor-pointer text-xs flex items-center gap-2 bg-rose-50/40 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <i className="ti ti-database-import" /> → to Rosewood database
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* FLASH CONTEXTUAL BANNER ALERT */}
      {flashMode === "pipedrive" && (
        <div className="bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 px-4 py-2.5 flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 transition-all animate-in slide-in-from-top duration-200">
          <i className="ti ti-bolt text-emerald-600 animate-pulse" />
          <span className="font-medium">Select an image card below to flash to Pipedrive account framework</span>
          <button 
            onClick={() => setFlashMode("")}
            className="ml-auto text-[11px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 px-2 py-1 rounded-md hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      )}

      {/* SECONDARY TOOLBAR FRAME */}
      <div className="flex items-center justify-between px-4 py-3 gap-4 flex-wrap bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800/50">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-950 p-0.5 rounded-lg border border-slate-200/60 dark:border-zinc-800">
          <button 
            onClick={() => setViewLayout("grid")}
            className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${viewLayout === "grid" ? "bg-white dark:bg-zinc-800 shadow-xs text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
          >
            <i className="ti ti-layout-grid text-sm" /> Cards
          </button>
          <button 
            onClick={() => setViewLayout("list")}
            className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${viewLayout === "list" ? "bg-white dark:bg-zinc-800 shadow-xs text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
          >
            <i className="ti ti-list text-sm" /> List
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert("Open system browser file picker → select valid structure .json config bundle")}
            className="text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-zinc-900"
          >
            <i className="ti ti-upload text-slate-400" /> Import
          </button>
          <button 
            onClick={() => alert("Compressing total stored architecture ledger registry database → downloading files bundle .zip")}
            className="text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-zinc-900"
          >
            <i className="ti ti-download text-slate-400" /> Export all
          </button>
        </div>
      </div>

      {/* MAIN DATA SHELF CONTAINER */}
      <div className="p-4 flex-1">
        {viewLayout === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img) => {
              const hasAuto = !!img.automationInstructions;
              const isRenaming = renamingId === img.id;
              return (
                <div 
                  key={img.id}
                  onClick={() => openInspectionPanel(img.id)}
                  className={`border rounded-xl p-4 cursor-pointer relative bg-white dark:bg-zinc-950 transition-all flex flex-col justify-between group h-44 select-none ${flashMode === "pipedrive" ? "border-emerald-500 hover:shadow-emerald-500/5 hover:shadow-lg bg-emerald-50/5" : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {img.pipelines[0]?.name.slice(0, 2).toUpperCase() || "PP"}
                      </div>
                      
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => triggerMenu(e, img.id)}
                          className="h-7 w-7 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center text-slate-400 hover:text-slate-600"
                        >
                          <i className="ti ti-dots-vertical text-base" />
                        </button>
                        {openMenuId === img.id && (
                          <div className="absolute right-0 top-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl z-20 min-w-[130px] overflow-hidden">
                            <button onClick={() => startRenameWorkflow(img.id, img.name)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 text-slate-700 dark:text-zinc-300"><i className="ti ti-pencil opacity-60" /> Rename</button>
                            <button onClick={() => alert(`Exporting dynamic string node package trace payload file for ${img.name}`)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 text-slate-700 dark:text-zinc-300"><i className="ti ti-download opacity-60" /> Export</button>
                            <button onClick={() => { setConfirmTargetId(img.id); setConfirmType("delete"); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1.5 text-rose-600 dark:text-rose-400 border-t border-slate-100 dark:border-zinc-800"><i className="ti ti-trash opacity-60" /> Delete</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isRenaming ? (
                      <div onClick={(e) => e.stopPropagation()} className="mb-2">
                        <input 
                          type="text" 
                          value={renameValue} 
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveRenameValue(img.id); if (e.key === "Escape") setRenamingId(null); }}
                          onBlur={() => saveRenameValue(img.id)}
                          className="w-full text-xs px-2 py-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-md focus:outline-none focus:border-emerald-500 font-medium"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <h3 className="text-xs font-semibold tracking-tight text-slate-900 dark:text-white line-clamp-1 mb-0.5">{img.name}</h3>
                    )}
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">{img.pipelines[0]?.stages.length || 0} tracking stages · {img.deals} template deals</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-900 pt-2.5 mt-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasAuto ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500"}`}>
                      {hasAuto ? "◆ automated" : "no automation"}
                    </span>
                    <span className="text-[10px] font-mono tracking-tight text-slate-400">{img.owner}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ROW LIST DISPLAY TEMPLATE LAYER */
          <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-zinc-950">
            {images.map((img, index) => {
              const hasAuto = !!img.automationInstructions;
              const isRenaming = renamingId === img.id;
              return (
                <div 
                  key={img.id}
                  onClick={() => openInspectionPanel(img.id)}
                  className={`flex items-center gap-4 px-4 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-all ${index > 0 ? "border-t border-slate-150 dark:border-zinc-900" : ""}`}
                >
                  <div className="h-7 w-7 rounded bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    {img.pipelines[0]?.name.slice(0, 2).toUpperCase() || "PP"}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <input 
                        type="text" 
                        value={renameValue} 
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveRenameValue(img.id); if (e.key === "Escape") setRenamingId(null); }}
                        onBlur={() => saveRenameValue(img.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-semibold px-2 py-0.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded w-48 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">{img.name}</h4>
                    )}
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate">{img.id} · {img.pipelines[0]?.stages.length || 0} stages · {img.deals} deals</p>
                  </div>

                  <span className="text-xs font-medium text-slate-400 font-mono hidden sm:inline">{img.owner}</span>
                  
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${hasAuto ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500"}`}>
                    {hasAuto ? "◆ automated" : "no automation"}
                  </span>

                  <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => triggerMenu(e, img.id)} className="h-6 w-6 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center text-slate-400">
                      <i className="ti ti-dots-vertical text-sm" />
                    </button>
                    {openMenuId === img.id && (
                      <div className="absolute right-0 top-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl z-20 min-w-[120px] overflow-hidden">
                        <button onClick={() => startRenameWorkflow(img.id, img.name)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1"><i className="ti ti-pencil" /> Rename</button>
                        <button onClick={() => alert(`Exporting ${img.name}`)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1"><i className="ti ti-download" /> Export</button>
                        <button onClick={() => { setConfirmTargetId(img.id); setConfirmType("delete"); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-1"><i className="ti ti-trash" /> Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* OVERLAY PANEL 1: DEEP-INSPECTION CONTROL MATRIX */}
      {detailId && activeDetailItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4 z-40 transition-all">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            
            {/* Modal Navigation Block */}
            <div className="px-5 py-4 border-b border-slate-150 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{activeDetailItem.name}</h2>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{activeDetailItem.id} · {activeDetailItem.owner}</p>
              </div>
              <button 
                onClick={() => setDetailId(null)}
                className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-900 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            {/* Content Display Selector Hooks */}
            <div className="flex border-b border-slate-150 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 px-2">
              <button 
                onClick={() => { setDetailTab("json"); setIsEditingJson(false); }}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-all ${detailTab === "json" ? "border-slate-900 dark:border-white text-slate-900 dark:text-white" : "border-transparent text-slate-400 hover:text-slate-600"}`}
              >
                API JSON
              </button>
              <button 
                onClick={() => { setDetailTab("auto"); setIsEditingAuto(false); }}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-all ${detailTab === "auto" ? "border-slate-900 dark:border-white text-slate-900 dark:text-white" : "border-transparent text-slate-400 hover:text-slate-600"}`}
              >
                Automation instructions
              </button>
            </div>

            {/* Modal Body Workspaces */}
            <div className="p-5 flex-1 overflow-y-auto">
              {detailTab === "json" ? (
                isEditingJson ? (
                  <div className="space-y-3">
                    <textarea 
                      value={jsonText}
                      onChange={(e) => setJsonText(e.target.value)}
                      className="w-full h-64 font-mono text-xs p-3 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setIsEditingJson(false)} className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium">Cancel</button>
                      <button onClick={saveEditedJsonStructure} className="px-3 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg text-xs font-medium">Save Blueprint</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <pre className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 rounded-xl text-xs font-mono overflow-x-auto max-h-64 text-slate-600 dark:text-zinc-400">{jsonText}</pre>
                    <div className="flex justify-end">
                      <button 
                        onClick={() => { setConfirmType("editJson"); setConfirmTargetId(activeDetailItem.id); }}
                        className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 hover:bg-slate-50"
                      >
                        <i className="ti ti-edit" /> Edit JSON Structure
                      </button>
                    </div>
                  </div>
                )
              ) : (
                /* AUTOMATION INSTRUCTIONS CONTENT WORKSPACE */
                !activeDetailItem.automationInstructions && !isEditingAuto ? (
                  <div className="text-center py-12 text-slate-400">
                    <i className="ti ti-file-off text-3xl block mb-3 text-slate-300" />
                    <p className="text-xs mb-4">No companion template checklist guides found in this bundle container package metadata ledger.</p>
                    <button 
                      onClick={() => { setIsEditingAuto(true); setAutoText(""); }}
                      className="text-xs bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                    >
                      <i className="ti ti-upload" /> Inject Manual Instructions
                    </button>
                  </div>
                ) : isEditingAuto ? (
                  <div className="space-y-3">
                    <textarea 
                      value={autoText}
                      onChange={(e) => setAutoText(e.target.value)}
                      placeholder="Paste plaintext automation setup guides here..."
                      className="w-full h-64 font-mono text-xs p-3 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setIsEditingAuto(false)} className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium">Cancel</button>
                      <button onClick={saveEditedAutomationManual} className="px-3 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg text-xs font-medium">Save Changes</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <pre className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 rounded-xl text-xs font-mono overflow-x-auto max-h-64 whitespace-pre-wrap text-slate-600 dark:text-zinc-400">{activeDetailItem.automationInstructions}</pre>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => alert("Select file manual swap input node")} className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium flex items-center gap-1"><i className="ti ti-upload" /> Replace file</button>
                      <button onClick={() => { setIsEditingAuto(true); setAutoText(activeDetailItem.automationInstructions || ""); }} className="px-3 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg text-xs font-medium flex items-center gap-1"><i className="ti ti-edit" /> Edit inline</button>
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
          
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              {abStep !== "select" && abStep !== "attach" && (
                <button onClick={() => setAbStep("select")} className="p-1 text-slate-400 hover:text-slate-600"><i className="ti ti-arrow-left text-lg" /></button>
              )}
              <i className="ti ti-wand text-emerald-500" />
              <span className="font-bold text-sm tracking-tight">AI Automation Guide Architect Studio</span>
            </div>
            <button onClick={() => setAbOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600"><i className="ti ti-x text-lg" /></button>
          </div>

          {/* Dynamic Step Workspaces Engine */}
          <div className="flex-1 overflow-y-auto p-5">
            {abStep === "select" && (
              <div className="max-w-xl mx-auto space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Select Base Configuration Template</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Choose an operational structural layout snapshot image file to initialize the compile sequence.</p>
                </div>
                <div className="space-y-2">
                  {images.map((im) => (
                    <div 
                      key={im.id}
                      onClick={() => initAiChatSequence(im.id)}
                      className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 cursor-pointer flex items-center gap-4 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
                    >
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-mono font-bold text-xs">{im.pipelines[0]?.name.slice(0, 2).toUpperCase()}</div>
                      <div className="flex-1">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white">{im.name}</h4>
                        <p className="text-[11px] text-slate-400">{im.pipelines[0]?.stages.length || 0} stages · {im.owner}</p>
                      </div>
                      <i className="ti ti-chevron-right text-slate-300" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {abStep === "chat" && (
              <div className="max-w-2xl mx-auto flex flex-col gap-4">
                {/* Visual Content Reference Context Card Frame */}
                <div className="flex justify-end animate-in fade-in slide-in-from-right-3">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 w-full max-w-xs shadow-xs">
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono">Linked Template Snapshot</span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">{images.find(i => i.id === abTargetId)?.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{images.find(i => i.id === abTargetId)?.pipelines[0]?.stages.length} system processing tracking stages mapped.</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {images.find(i => i.id === abTargetId)?.pipelines[0]?.stages.map((s, idx) => (
                        <span key={idx} className="text-[10px] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-slate-500">{s.name}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Question Box Block */}
                <div className="flex items-start gap-3 animate-in fade-in slide-in-from-left-3 duration-200 delay-75">
                  <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center font-bold text-sm text-emerald-500 flex-shrink-0">◆</div>
                  <div className="space-y-4 flex-1">
                    <div className="bg-slate-50 dark:bg-zinc-900 rounded-2xl p-4 text-xs max-w-md border border-slate-100 dark:border-zinc-850 leading-relaxed">
                      Ecosystem framework context mapped successfully. Which structural extensions, tools, or custom application integration webhooks apply to this setup configuration snapshot build?
                    </div>
                    
                    {/* Checkbox Matrix Selector Field Frame */}
                    <div className="space-y-3 pl-1">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {INTEGRATIONS.map((integ) => {
                          const active = abSelectedIntegs.includes(integ);
                          return (
                            <div 
                              key={integ}
                              onClick={() => setAbSelectedIntegs(active ? abSelectedIntegs.filter(i => i !== integ) : [...abSelectedIntegs, integ])}
                              className={`border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition-all select-none ${active ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-slate-200 dark:border-zinc-850 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"}`}
                            >
                              <i className={`ti ${INTEG_ICONS[integ] || "ti-plug"} text-sm`} />
                              <span className="text-[11px] font-medium tracking-tight truncate">{integ}</span>
                            </div>
                          );
                        })}
                      </div>
                      <button 
                        onClick={triggerAiFirstPass}
                        className="text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm hover:opacity-95"
                      >
                        Continue Matrix Analysis <i className="ti ti-arrow-right" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FIRST PASS PROCESSING PLACEHOLDER DOTS VIEW */}
            {abStep === "building" && (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400 max-w-xs mx-auto text-center">
                <div className="flex gap-1.5 items-center">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" />
                </div>
                <p className="text-xs font-medium tracking-tight">Compiling structural blueprint records context variables payload tree...</p>
              </div>
            )}

            {/* TWO-PASS COMPILATION VERIFICATION STEP VIEW */}
            {abStep === "preview" && (
              <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center font-bold text-sm text-emerald-500">◆</div>
                  <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 rounded-2xl p-4 text-xs max-w-md">
                    Structure validation skeleton preview compiled. Verify naming schema allocations and update descriptive summaries below before authorizing full clicking instructions compilation.
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm pl-1">
                  <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-xs font-mono flex items-center justify-between">
                    <span>automation_recipe_manifest.json</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-zinc-900 max-h-60 overflow-y-auto px-4">
                    {abPreviewItems.map((item, index) => (
                      <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-slate-500 h-5 flex items-center">{item.id}</span>
                        <div className="flex-1 space-y-1">
                          <input 
                            type="text" 
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...abPreviewItems];
                              updated[index].name = e.target.value;
                              setAbPreviewItems(updated);
                            }}
                            className="w-full text-xs font-semibold bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-400 focus:outline-none"
                          />
                          <input 
                            type="text" 
                            value={item.desc}
                            onChange={(e) => {
                              const updated = [...abPreviewItems];
                              updated[index].desc = e.target.value;
                              setAbPreviewItems(updated);
                            }}
                            className="w-full text-[11px] text-slate-400 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={abIsConfirmed}
                      onChange={(e) => setAbIsConfirmed(e.target.checked)}
                      className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <span>Verify specifications match functional operational nuance parameters</span>
                  </label>
                  <button 
                    onClick={commitAiSecondPass}
                    className="text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2 rounded-xl flex items-center gap-1 hover:opacity-95 shadow-sm"
                  >
                    Compile Detailed Manifest <i className="ti ti-arrow-right" />
                  </button>
                </div>
              </div>
            )}

            {/* STAGE MANIFEST GENERATION COMPLETED VIEW */}
            {abStep === "done" && (
              <div className="max-w-xl mx-auto space-y-5 text-center py-8 animate-in zoom-in-95 duration-200">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-2xl mx-auto">
                  <i className="ti ti-file-check" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Immutable Click Guide Manual Generated</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-0.5">The step-by-step click pathway manifest configuration log file asset package compilation is complete.</p>
                </div>

                <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 max-w-sm mx-auto flex items-center gap-3 text-left">
                  <i className="ti ti-file-text text-2xl text-emerald-500" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 truncate">automation_instructions.txt</h4>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-500">{abPreviewItems.length} sequential configuration recipes mapped perfectly.</p>
                  </div>
                  <button 
                    onClick={() => alert("Triggering browser download loop sequence to store file asset locally.")}
                    className="bg-white dark:bg-zinc-900 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-500/10 transition-colors flex items-center gap-1"
                  >
                    <i className="ti ti-download" /> Download
                  </button>
                </div>

                <button 
                  onClick={() => setAbStep("attach")}
                  className="text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2 rounded-xl"
                >
                  Continue Build Loop
                </button>
              </div>
            )}

            {/* HANDOFF PACKAGING REGISTRY ROUTE STEP */}
            {abStep === "attach" && (
              <div className="max-w-xs mx-auto text-center py-16 space-y-4 animate-in fade-in duration-200">
                <div className="h-10 w-10 bg-slate-100 dark:bg-zinc-900 text-slate-400 rounded-full flex items-center justify-center text-lg mx-auto">◆</div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bind Guide to Stored Image?</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Would you like to attach this manual text file recipe blueprint to the parent database node template card?</p>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <button onClick={() => bindAiInstructionsToTemplate(false)} className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-slate-600">Keep local only</button>
                  <button onClick={() => bindAiInstructionsToTemplate(true)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 shadow-sm">Yes, attach to card</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION GATES ALERT DIALOG LAYOUT MODULES */}
      {confirmType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 w-full max-w-xs shadow-2xl animate-in zoom-in-95 duration-150">
            {confirmType === "flash" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm"><i className="ti ti-bolt text-emerald-500" /> Confirm outbound flash</div>
                <p className="text-xs text-slate-400 leading-relaxed">Are you sure you want to programmatically deploy the pipelines, stage matrix maps, and variable directory profiles of <strong>{images.find(i=>i.id===confirmTargetId)?.name}</strong> into the connected API key token workspace env?</p>
                <div className="flex justify-end gap-2 text-xs font-semibold">
                  <button onClick={() => setConfirmType(null)} className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg">Cancel</button>
                  <button onClick={confirmFlashOutbound} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm">Flash now</button>
                </div>
              </div>
            )}
            {confirmType === "delete" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm"><i className="ti ti-trash" /> Clear record image</div>
                <p className="text-xs text-slate-400 leading-relaxed">Delete template card <strong>{images.find(i=>i.id===confirmTargetId)?.name}</strong>? This structural action asset ledger rewrite cannot be undone.</p>
                <div className="flex justify-end gap-2 text-xs font-semibold">
                  <button onClick={() => setConfirmType(null)} className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg">Cancel</button>
                  <button onClick={confirmDeleteImage} className="px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-sm">Delete</button>
                </div>
              </div>
            )}
            {confirmType === "fromPipedrive" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm"><i className="ti ti-database-import text-rose-500" /> Capture Snapshot</div>
                <p className="text-xs text-slate-400 leading-relaxed">Determine data intake schema processing vector routing configuration rule target path:</p>
                <div className="flex flex-col gap-1.5 text-xs font-semibold">
                  <button onClick={() => handleInboundCapture("new")} className="w-full py-1.75 bg-slate-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg">Create new file card</button>
                  <button onClick={() => handleInboundCapture("overwrite")} className="w-full py-1.75 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-50">Overwrite existing snapshot</button>
                  <button onClick={() => setConfirmType(null)} className="w-full py-1.75 text-slate-400 hover:text-slate-500 font-normal mt-1">Cancel</button>
                </div>
              </div>
            )}
            {confirmType === "editJson" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-sm"><i className="ti ti-alert-triangle" /> Modify Raw API Schema?</div>
                <p className="text-xs text-slate-400 leading-relaxed">Manual updates directly targeting structural primitive string schema array models can break cross-account deployment sequences. Proceed?</p>
                <div className="flex justify-end gap-2 text-xs font-semibold">
                  <button onClick={() => setConfirmType(null)} className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg">Cancel</button>
                  <button onClick={() => { setConfirmType(null); setIsEditingJson(true); }} className="px-3 py-1.5 bg-amber-500 text-white rounded-lg shadow-sm">Yes, unlock schema</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
