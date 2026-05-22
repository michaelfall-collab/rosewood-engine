// app/studio/page.tsx
"use client";

// INSERT AT TOP OF FILE BELOW "use client";
interface StudioStage {
  id: string;
  name: string;
  rottenDays: number | null;
}

interface StudioPipeline {
  id: string;
  name: string;
  stages: StudioStage[];
}

interface StudioCustomField {
  id: string;
  name: string;
  type: string;
  scope: string;
  options: string[];
}

interface StudioBlueprint {
  id: string;
  name: string;
  version: string;
  pipelines: StudioPipeline[];
  customFields: StudioCustomField[];
}

import { useState, useEffect } from "react";

const initialBlueprintsCatalog = [
  {
    id: "rosewood_ops_v1",
    name: "Rosewood Lifecycle Blueprint (Static)",
    version: "1.2.0",
    pipelines: [
      {
        id: "pip_static_1",
        name: "Lead to Waitlist Track",
        stages: [{ id: "stg_s1", name: "Screening Phase", rottenDays: 14 }]
      }
    ],
    customFields: [
      { id: "fld_1", name: "Lead Source Detail", type: "dropdown", scope: "Deals", options: ["Google Ads", "Referral Partner", "Organic"] }
    ]
  }
];

export default function VersionEditor() {
  const [catalog, setCatalog] = useState<StudioBlueprint[]>(initialBlueprintsCatalog as any);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("rosewood_ops_v1");
  const [activePipelineId, setActivePipelineId] = useState("pip_static_1");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);
  
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [newFieldOption, setNewFieldOption] = useState("");

  // Hydrate custom blueprint files dynamically from browser storage on page mount
  useEffect(() => {
    const rawSaved = localStorage.getItem("rosewood_discovered_blueprint");
    if (rawSaved) {
      try {
        const parsedBlueprint = JSON.parse(rawSaved);
        // Label it cleanly so you know it's your live account data stream
        parsedBlueprint.name = "Live Ingested Architecture Profile";
        parsedBlueprint.id = "live_ingested_profile";

        setCatalog([parsedBlueprint, ...initialBlueprintsCatalog]);
        setSelectedBlueprintId("live_ingested_profile");
        if (parsedBlueprint.pipelines.length > 0) {
          setActivePipelineId(parsedBlueprint.pipelines[0].id);
        }
      } catch (e) {
        console.error("Failed parsing storage infrastructure block:", e);
      }
    }
  }, []);

  const currentBlueprint = catalog.find(b => b.id === selectedBlueprintId) || catalog[0];
  const currentPipeline = currentBlueprint?.pipelines.find(p => p.id === activePipelineId) || currentBlueprint?.pipelines[0];

  const switchBlueprint = (id: string) => {
    setSelectedBlueprintId(id);
    const target = catalog.find(b => b.id === id);
    if (target && target.pipelines.length > 0) {
      setActivePipelineId(target.pipelines[0].id);
    }
  };

  // --- MUTATORS ---
  const handleAddPipeline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipelineName.trim()) return;

    const pipelineId = "pip_" + Date.now();
    const freshPipeline = {
      id: pipelineId,
      name: newPipelineName.trim(),
      stages: [{ id: "stg_" + Date.now(), name: "Initial Stage", rottenDays: null }]
    };

    setCatalog((prev: any[]) => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      pipelines: [...b.pipelines, freshPipeline]
    }));

    setActivePipelineId(pipelineId);
    setNewPipelineName("");
  };

  const handleDeletePipeline = (id: string) => {
    if (currentBlueprint.pipelines.length <= 1) return;
    const remaining = currentBlueprint.pipelines.filter(p => p.id !== id);
    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : { ...b, pipelines: remaining }));
    setActivePipelineId(remaining[0].id);
  };

  const handleUpdateStageName = (stageId: string, name: string) => {
    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      pipelines: b.pipelines.map(p => ({
        ...p,
        stages: p.stages.map(s => s.id === stageId ? { ...s, name } : s)
      }))
    }));
  };

  // REPLACE YOUR handleUpdateRottenDays LOOP INNER CONTENT WITH THIS TYPE-CAST BLOCK
  const handleUpdateRottenDays = (stageId: string, days: number | null) => {
    setCatalog((prev: StudioBlueprint[]) => prev.map(b => b.id !== selectedBlueprintId ? b : {
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

    const freshStage: StudioStage = { id: "stg_" + Date.now(), name: newStageName.trim(), rottenDays: null };
    setCatalog((prev: StudioBlueprint[]) => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      pipelines: b.pipelines.map(p => p.id !== activePipelineId ? p : { ...p, stages: [...p.stages, freshStage] })
    }));
    setNewStageName("");
  };

  const handleDuplicateStage = (stageId: string) => {
    if (!currentPipeline) return;
    const targetStage = currentPipeline.stages.find(s => s.id === stageId);
    if (!targetStage) return;

    const duplicate = { ...targetStage, id: "stg_" + Date.now(), name: `${targetStage.name} (Copy)` };
    const targetIdx = currentPipeline.stages.findIndex(s => s.id === stageId);
    const updatedStages = [...currentPipeline.stages];
    updatedStages.splice(targetIdx + 1, 0, duplicate);

    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      pipelines: b.pipelines.map(p => p.id !== activePipelineId ? p : { ...p, stages: updatedStages })
    }));
  };

  const handleDeleteStage = (stageId: string) => {
    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      pipelines: b.pipelines.map(p => ({ ...p, stages: p.stages.filter(s => s.id !== stageId) }))
    }));
  };

  const handleAddOptionToField = (fieldId: string) => {
    if (!newFieldOption.trim()) return;
    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      customFields: b.customFields.map(f => f.id !== fieldId ? f : { ...f, options: [...(f.options || []), newFieldOption.trim()] })
    }));
    setNewFieldOption("");
  };

  const handleRemoveOptionFromField = (fieldId: string, optionToRemove: string) => {
    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      customFields: b.customFields.map(f => f.id !== fieldId ? f : { ...f, options: f.options.filter(o => o !== optionToRemove) })
    }));
  };

  return (
    <div className="max-w-full mx-auto flex flex-col bg-white dark:bg-zinc-900 min-h-[700px] overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-md font-sans">
      {/* Top Toolbar */}
      <div className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
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
              <button onClick={() => handleDeletePipeline(currentPipeline.id)} className="text-[10px] text-rose-500 hover:underline font-bold ml-2 font-mono">
                [Delete Pipeline]
              </button>
            )}
          </div>

          {isEditMode && (
            <form onSubmit={handleAddPipeline} className="flex items-center space-x-2 border-l border-slate-200 dark:border-zinc-800 pl-4">
              <input
                type="text"
                placeholder="New Pipeline Name..."
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1 text-xs focus:outline-none"
              />
              <button type="submit" disabled={!newPipelineName.trim()} className="bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 px-2 py-1 rounded text-[11px] font-bold disabled:opacity-40">
                + Add Pipeline
              </button>
            </form>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsFieldsModalOpen(true)}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 px-3 py-1.5 rounded text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition"
          >
            <span>⚙️</span>
            <span>Dictionary Fields ({currentBlueprint.customFields?.length || 0})</span>
          </button>

          <button
            onClick={() => {
              if (isEditMode) {
                // Save current blueprint to localStorage before exiting edit mode
                localStorage.setItem("rosewood_discovered_blueprint", JSON.stringify(currentBlueprint));
              }
              setIsEditMode(!isEditMode);
            }}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition shadow-xs ${isEditMode ? 'bg-amber-600 border border-amber-700 text-white hover:bg-amber-500' : 'bg-[#3cb371] border border-[#2e8b57] text-white hover:opacity-90'}`}
          >
            {isEditMode ? "🔒 Save Changes" : "🛠️ Edit Blueprint"}
          </button>
        </div>
      </div>

      {/* Kanban Canvas Viewport Layout */}
      <div className="flex-1 bg-[#f4f5f6] dark:bg-zinc-950/40 p-6 overflow-x-auto flex items-start space-x-4 min-h-[550px] scrollbar-thin">
        {currentPipeline?.stages.map((stage) => (
          <div key={stage.id} className="w-[230px] shrink-0 flex flex-col space-y-3">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs space-y-2">
              {isEditMode ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={stage.name}
                    onChange={(e) => handleUpdateStageName(stage.id, e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1 text-xs font-bold focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Disabled"
                    value={stage.rottenDays || ""}
                    onChange={(e) => handleUpdateRottenDays(stage.id, e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1 text-xs font-mono focus:outline-none"
                  />
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-zinc-800 text-[10px] font-mono">
                    <button type="button" onClick={() => handleDuplicateStage(stage.id)} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                      📦 Duplicate
                    </button>
                    <button type="button" onClick={() => handleDeleteStage(stage.id)} className="text-rose-500 font-bold hover:underline">
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

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-lg p-3 shadow-xs flex justify-between items-start">
              <div className="space-y-1">
                <h4 className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-mono">[Sample Blueprint Deal]</h4>
                <p className="text-[10px] text-slate-500 font-medium">Workspace Validation Record</p>
                <span className="text-[10px] font-mono text-slate-400">$0</span>
              </div>
            </div>
          </div>
        ))}

        {isEditMode && currentPipeline && (
          <form onSubmit={handleAddStage} className="w-[230px] shrink-0 bg-white/40 dark:bg-zinc-900/10 border border-dashed border-slate-300 dark:border-zinc-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold font-sans text-slate-500">Append New Stage</h4>
            <input
              type="text"
              placeholder="Stage Name Description..."
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs focus:outline-none"
            />
            <button type="submit" disabled={!newStageName.trim()} className="w-full bg-slate-900 dark:bg-zinc-100 dark:text-zinc-900 font-sans font-bold py-1.5 px-3 rounded-md text-xs hover:opacity-90 disabled:opacity-30 transition">
              + Create Stage
            </button>
          </form>
        )}
      </div>

      {/* Fields Dictionary Overlay Modal */}
      {isFieldsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 max-w-2xl w-full rounded-xl shadow-xl overflow-hidden flex flex-col h-[520px]">
            <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">Configuration Metadata Mapping</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Custom Fields Options Dictionary</h3>
              </div>
              <button onClick={() => { setIsFieldsModalOpen(false); setEditingFieldId(null); }} className="text-slate-400 hover:text-slate-600 text-xs font-mono font-bold bg-slate-200/50 dark:bg-zinc-800 px-2 py-1 rounded">
                Close
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/2 border-r border-slate-200 dark:border-zinc-800 p-4 overflow-y-auto space-y-2 bg-slate-50/50 dark:bg-zinc-950/10">
                {currentBlueprint.customFields?.map((field: any) => (
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

              <div className="w-1/2 p-5 overflow-y-auto bg-white dark:bg-zinc-900">
                {editingFieldId ? (
                  (() => {
                    const field = currentBlueprint.customFields.find((f: any) => f.id === editingFieldId);
                    if (!field) return null;
                    
                    return (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">{field.name} Options</h4>
                        </div>

                        {field.type === "dropdown" ? (
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              {field.options?.map((option: string, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 text-xs font-mono">
                                  <span className="text-slate-800 dark:text-zinc-200">{option}</span>
                                  <button type="button" onClick={() => handleRemoveOptionFromField(field.id, option)} className="text-[10px] text-rose-500 hover:underline">
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
                                <button type="button" onClick={() => handleAddOptionToField(field.id)} className="bg-[#3cb371] text-white font-sans font-bold px-3 py-1 rounded text-[11px] shadow-xs">
                                  Save Option Item
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 font-sans italic pt-12">
                            Standard field parameters (monetary, text, user) are derived globally. No sub-options config needed.
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-4 rounded-xl text-center text-xs text-slate-400 font-sans italic pt-24">
                    Select an operational dictionary item to explore or alter its data target sub-options tree.
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