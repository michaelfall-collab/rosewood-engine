// app/studio/page.tsx
"use client";

import { useState } from "react";

// The full 4-pipeline operational blueprint lifecycle
const initialBlueprintsCatalog = [
  {
    id: "rosewood_ops_v1",
    name: "Rosewood Lifecycle Blueprint",
    version: "1.2.0",
    pipelines: [
      {
        id: "pip_1",
        name: "Lead to Waitlist",
        stages: [
          { id: "stg_1", name: "Initial Contact & Screening", rottenDays: 14 },
          { id: "stg_2", name: "Information Sent, Pending Response", rottenDays: 30 },
          { id: "stg_3", name: "Discovery Call Scheduling", rottenDays: 7 },
          { id: "stg_4", name: "Sales & Qualification Phase", rottenDays: 7 },
          { id: "stg_5", name: "\"Won\" Opportunity", rottenDays: 1 },
          { id: "stg_6", name: "Long Term Leads", rottenDays: null },
          { id: "stg_7", name: "Client Lost", rottenDays: null }
        ]
      },
      {
        id: "pip_2",
        name: "Waitlist to Onboarding",
        stages: [
          { id: "stg_8", name: "The Waitlist (Nurture Phase)", rottenDays: null },
          { id: "stg_9", name: "Pre-Onboarding & Team Assignment", rottenDays: 7 },
          { id: "stg_10", name: "MSC Scheduling & Internal Setup", rottenDays: 21 },
          { id: "stg_11", name: "Phase 1 Onboarding - MSC", rottenDays: 35 },
          { id: "stg_12", name: "Phase 2 Onboarding - Core Messaging", rottenDays: 14 },
          { id: "stg_13", name: "Onboarded Client", rottenDays: 1 }
        ]
      },
      {
        id: "pip_3",
        name: "Onboarded Client",
        stages: [
          { id: "stg_14", name: "Ongoing Client Relationship", rottenDays: null },
          { id: "stg_15", name: "Strategic Health Review", rottenDays: 7 },
          { id: "stg_16", name: "Annual Strategy Refresh", rottenDays: 7 },
          { id: "stg_17", name: "Account At-Risk", rottenDays: 3 },
          { id: "stg_18", name: "Graduated Client", rottenDays: 1 }
        ]
      },
      {
        id: "pip_4",
        name: "Post Graduation & Legacy Clients",
        stages: [
          { id: "stg_19", name: "Graduated - Evaluate Client Status", rottenDays: 3 },
          { id: "stg_20", name: "Graduated - Warm Referral Partner", rottenDays: null },
          { id: "stg_21", name: "Graduated - Recovery Evaluation", rottenDays: null },
          { id: "stg_22", name: "Intermittent Project Work", rottenDays: null },
          { id: "stg_23", name: "Inactive - No Further Contact", rottenDays: null }
        ]
      }
    ],
    customFields: [
      { id: "fld_1", name: "Lead Source Detail", type: "dropdown", scope: "Deals", options: ["Google Ads", "Referral Partner", "Direct Mailer", "Organic Search"] },
      { id: "fld_2", name: "Estimated Revenue Block", type: "monetary", scope: "Deals", options: [] },
      { id: "fld_3", name: "Fulfillment Architect Assigned", type: "user", scope: "Deals", options: [] },
      { id: "fld_4", name: "Building Dimensions Map", type: "text", scope: "Organizations", options: [] }
    ]
  },
  {
    id: "velocity_distribution_v1",
    name: "Velocity Sales Blueprint",
    version: "1.0.4",
    pipelines: [
      {
        id: "pip_5",
        name: "Inbound Fulfillment Track",
        stages: [
          { id: "stg_24", name: "Intake Captured", rottenDays: null },
          { id: "stg_25", name: "Proposal Dispatched", rottenDays: 5 },
          { id: "stg_26", name: "Contract Finalized", rottenDays: null }
        ]
      }
    ],
    customFields: [
      { id: "fld_5", name: "Logistics Routing Check", type: "boolean", scope: "Deals", options: [] }
    ]
  }
];

export default function VersionEditor() {
  const [catalog, setCatalog] = useState(initialBlueprintsCatalog);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("rosewood_ops_v1");
  const [activePipelineId, setActivePipelineId] = useState("pip_1");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);
  
  // Creation States
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [newFieldOption, setNewFieldOption] = useState("");

  const currentBlueprint = catalog.find(b => b.id === selectedBlueprintId) || catalog[0];
  const currentPipeline = currentBlueprint.pipelines.find(p => p.id === activePipelineId) || currentBlueprint.pipelines[0] || currentBlueprint.pipelines[0];

  const switchBlueprint = (id: string) => {
    setSelectedBlueprintId(id);
    const target = catalog.find(b => b.id === id);
    if (target && target.pipelines.length > 0) {
      setActivePipelineId(target.pipelines[0].id);
    }
  };

  // --- PIPELINE MUTATORS ---
  const handleAddPipeline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipelineName.trim()) return;

    const pipelineId = "pip_" + Date.now();
    const freshPipeline = {
      id: pipelineId,
      name: newPipelineName.trim(),
      stages: [{ id: "stg_" + Date.now(), name: "Initial Stage", rottenDays: null }]
    };

    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      pipelines: [...b.pipelines, freshPipeline]
    }));

    setActivePipelineId(pipelineId);
    setNewPipelineName("");
  };

  const handleDeletePipeline = (id: string) => {
    if (currentBlueprint.pipelines.length <= 1) {
      alert("A blueprint manifest requires at least one pipeline channel layer.");
      return;
    }
    const remaining = currentBlueprint.pipelines.filter(p => p.id !== id);
    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : { ...b, pipelines: remaining }));
    setActivePipelineId(remaining[0].id);
  };

  // --- STAGE MUTATORS ---
  const handleUpdateStageName = (stageId: string, name: string) => {
    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      pipelines: b.pipelines.map(p => ({
        ...p,
        stages: p.stages.map(s => s.id === stageId ? { ...s, name } : s)
      }))
    }));
  };

  const handleUpdateRottenDays = (stageId: string, days: number | null) => {
    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      pipelines: b.pipelines.map(p => ({
        ...p,
        stages: p.stages.map(s => s.id === stageId ? { ...s, rottenDays: days } : s)
      }))
    }));
  };

  const handleAddStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim() || !currentPipeline) return;

    const freshStage = {
      id: "stg_" + Date.now(),
      name: newStageName.trim(),
      rottenDays: null
    };

    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      pipelines: b.pipelines.map(p => p.id !== activePipelineId ? p : {
        ...p,
        stages: [...p.stages, freshStage]
      })
    }));
    setNewStageName("");
  };

  const handleDuplicateStage = (stageId: string) => {
    if (!currentPipeline) return;
    const targetStage = currentPipeline.stages.find(s => s.id === stageId);
    if (!targetStage) return;

    const duplicate = {
      ...targetStage,
      id: "stg_" + Date.now(),
      name: `${targetStage.name} (Copy)`
    };

    const targetIdx = currentPipeline.stages.findIndex(s => s.id === stageId);
    const updatedStages = [...currentPipeline.stages];
    updatedStages.splice(targetIdx + 1, 0, duplicate);

    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      pipelines: b.pipelines.map(p => p.id !== activePipelineId ? p : {
        ...p,
        stages: updatedStages
      })
    }));
  };

  const handleDeleteStage = (stageId: string) => {
    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      pipelines: b.pipelines.map(p => ({
        ...p,
        stages: p.stages.filter(s => s.id !== stageId)
      }))
    }));
  };

  // --- CUSTOM FIELD MUTATORS ---
  const handleAddOptionToField = (fieldId: string) => {
    if (!newFieldOption.trim()) return;
    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      customFields: b.customFields.map(f => f.id !== fieldId ? f : {
        ...f,
        options: [...(f.options || []), newFieldOption.trim()]
      })
    }));
    setNewFieldOption("");
  };

  const handleRemoveOptionFromField = (fieldId: string, optionToRemove: string) => {
    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      customFields: b.customFields.map(f => f.id !== fieldId ? f : {
        ...f,
        options: f.options.filter(o => o !== optionToRemove)
      })
    }));
  };

  return (
    <div className="max-w-full mx-auto flex flex-col bg-white dark:bg-zinc-900 min-h-[700px] overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-md font-sans">
      
      {/* Top Controls Toolbar Panel Strip */}
      <div className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Blueprint Select Dropdown Grid Wrapper */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Blueprint Manifest:</span>
            <select
              value={selectedBlueprintId}
              onChange={(e) => switchBlueprint(e.target.value)}
              className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 rounded px-2.5 py-1 text-xs font-bold focus:outline-none"
            >
              {catalog.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Active Pipeline Dropdown Parameter Tracker */}
          <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-zinc-800 pl-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Pipeline Channel:</span>
            {currentPipeline ? (
              <select
                value={activePipelineId}
                onChange={(e) => setActivePipelineId(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1 text-xs font-extrabold text-slate-800 dark:text-zinc-200 focus:outline-none"
              >
                {currentBlueprint.pipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs italic text-slate-400">No pipelines present</span>
            )}

            {isEditMode && currentPipeline && (
              <button
                onClick={() => handleDeletePipeline(currentPipeline.id)}
                className="text-[10px] text-rose-500 hover:underline font-bold ml-2 font-mono"
              >
                [Delete Pipeline]
              </button>
            )}
          </div>

          {/* Inline Form to Append New Pipelines in Edit Mode */}
          {isEditMode && (
            <form onSubmit={handleAddPipeline} className="flex items-center space-x-2 border-l border-slate-200 dark:border-zinc-800 pl-4 animate-fade-in">
              <input
                type="text"
                placeholder="New Pipeline Name..."
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1 text-xs font-sans focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newPipelineName.trim()}
                className="bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 px-2 py-1 rounded text-[11px] font-bold disabled:opacity-40"
              >
                + Add Pipeline
              </button>
            </form>
          )}

        </div>

        {/* Global Modal View and Configuration Triggers */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsFieldsModalOpen(true)}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 px-3 py-1.5 rounded text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition"
          >
            <span>⚙️</span>
            <span>Dictionary Fields ({currentBlueprint.customFields.length})</span>
          </button>

          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition shadow-xs ${isEditMode ? 'bg-amber-600 border border-amber-700 text-white hover:bg-amber-500' : 'bg-[#3cb371] border border-[#2e8b57] text-white hover:opacity-90'}`}
          >
            {isEditMode ? "🔒 Save Changes" : "🛠️ Edit Blueprint"}
          </button>
        </div>
      </div>

      {/* Main Board Kanban Stage Layout Area */}
      <div className="flex-1 bg-[#f4f5f6] dark:bg-zinc-950/40 p-6 overflow-x-auto flex items-start space-x-4 min-h-[550px] scrollbar-thin">
        
        {currentPipeline?.stages.map((stage) => (
          <div key={stage.id} className="w-[230px] shrink-0 flex flex-col space-y-3 animate-fade-in">
            
            {/* Stage Configuration Column Header Card */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs space-y-2">
              {isEditMode ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] uppercase font-mono font-bold text-slate-400">Stage Name</label>
                    <input
                      type="text"
                      value={stage.name}
                      onChange={(e) => handleUpdateStageName(stage.id, e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1 text-xs font-bold mt-0.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-mono font-bold text-slate-400">Rotting Trigger (Days)</label>
                    <input
                      type="number"
                      placeholder="Disabled"
                      value={stage.rottenDays || ""}
                      onChange={(e) => handleUpdateRottenDays(stage.id, e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1 text-xs font-mono mt-0.5 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-zinc-800 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => handleDuplicateStage(stage.id)}
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      📦 Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStage(stage.id)}
                      className="text-rose-500 font-bold hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate tracking-tight">{stage.name}</h3>
                  <div className="flex justify-between items-center mt-1 text-[10px] font-mono font-semibold text-slate-400">
                    <span>1 Active Object</span>
                    {stage.rottenDays && (
                      <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 px-1.5 py-0.5 rounded">
                        ⌛ {stage.rottenDays}d
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Static Clean Mock Object Visual Field Container */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-lg p-3 shadow-xs flex justify-between items-start">
              <div className="space-y-1">
                <h4 className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                  [Sample Blueprint Deal]
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  Workspace Validation Record
                </p>
                <span className="text-[10px] font-mono text-slate-400">$0</span>
              </div>
            </div>

          </div>
        ))}

        {/* Dynamic Column Card to Append New Stages Anywhere, visible in Edit mode */}
        {isEditMode && currentPipeline && (
          <form onSubmit={handleAddStage} className="w-[230px] shrink-0 bg-white/40 dark:bg-zinc-900/10 border border-dashed border-slate-300 dark:border-zinc-800 rounded-xl p-4 space-y-3 animate-fade-in">
            <h4 className="text-xs font-bold font-sans text-slate-500">Append New Stage</h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Stage Name Description..."
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newStageName.trim()}
                className="w-full bg-slate-900 dark:bg-zinc-100 dark:text-zinc-900 font-sans font-bold py-1.5 px-3 rounded-md text-xs hover:opacity-90 disabled:opacity-30 transition"
              >
                + Create Stage
              </button>
            </div>
          </form>
        )}

        {/* Fallback layout notice block */}
        {!currentPipeline && (
          <div className="w-full py-12 text-center text-xs font-mono italic text-slate-400">
            No pipeline layers configured. Add a pipeline channel to begin layout construction.
          </div>
        )}

      </div>

      {/* Slide overlay Modal: Metadata Options Dictionary Window view */}
      {isFieldsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 max-w-2xl w-full rounded-xl shadow-xl overflow-hidden flex flex-col h-[520px]">
            
            <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">Configuration Metadata Mapping</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Custom Fields Options Dictionary</h3>
              </div>
              <button 
                onClick={() => { setIsFieldsModalOpen(false); setEditingFieldId(null); }}
                className="text-slate-400 hover:text-slate-600 text-xs font-mono font-bold bg-slate-200/50 dark:bg-zinc-800 px-2 py-1 rounded"
              >
                Close
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Fields List Registry view */}
              <div className="w-1/2 border-r border-slate-200 dark:border-zinc-800 p-4 overflow-y-auto space-y-2 bg-slate-50/50 dark:bg-zinc-950/10">
                {currentBlueprint.customFields.map((field) => (
                  <div
                    key={field.id}
                    onClick={() => setEditingFieldId(field.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${editingFieldId === field.id ? 'border-slate-800 dark:border-zinc-400 bg-white dark:bg-zinc-800 shadow-xs font-semibold' : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-200'}`}
                  >
                    <div className="text-xs text-slate-900 dark:text-zinc-100 flex items-center justify-between">
                      <span>{field.name}</span>
                      {field.type === "dropdown" && <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1 rounded font-mono font-bold">Options</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono font-normal mt-0.5">{field.scope} • {field.type}</div>
                  </div>
                ))}
              </div>

              {/* Sub-item values detail editor configuration */}
              <div className="w-1/2 p-5 overflow-y-auto bg-white dark:bg-zinc-900">
                {editingFieldId ? (
                  (() => {
                    const field = currentBlueprint.customFields.find(f => f.id === editingFieldId);
                    if (!field) return null;
                    
                    return (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">{field.name} Options</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">Manage validation options embedded directly inside this blueprint package manifest.</p>
                        </div>

                        {field.type === "dropdown" ? (
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              {field.options?.map((option, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 text-xs font-mono">
                                  <span className="text-slate-800 dark:text-zinc-200">{option}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOptionFromField(field.id, option)}
                                    className="text-[10px] text-rose-500 hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>

                            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-1.5">
                              <input
                                type="text"
                                placeholder="Add custom dropdown item label..."
                                value={newFieldOption}
                                onChange={(e) => setNewFieldOption(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1.5 text-xs focus:outline-none"
                              />
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleAddOptionToField(field.id)}
                                  className="bg-[#3cb371] text-white font-sans font-bold px-3 py-1 rounded text-[11px] shadow-xs"
                                >
                                  Save Option Item
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 font-sans italic pt-12">
                            Standard field parameters (monetary, text, user) are derived globally from unmutated object rules. No array sub-options config needed.
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-4 rounded-xl text-center text-xs text-slate-400 font-sans italic pt-24">
                    Select an operational dictionary item to explore or alter its data target sub-options tree configuration attributes.
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}