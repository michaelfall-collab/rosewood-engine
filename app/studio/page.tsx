// app/studio/page.tsx
"use client";

import { useState } from "react";

// Robust state schema handling full 4-pipeline structures and nested custom field options data
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
  
  // Field management states
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldOption, setNewFieldOption] = useState("");

  const currentBlueprint = catalog.find(b => b.id === selectedBlueprintId) || catalog[0];
  const currentPipeline = currentBlueprint.pipelines.find(p => p.id === activePipelineId) || currentBlueprint.pipelines[0];

  const switchBlueprint = (id: string) => {
    setSelectedBlueprintId(id);
    const target = catalog.find(b => b.id === id);
    if (target && target.pipelines.length > 0) {
      setActivePipelineId(target.pipelines[0].id);
    }
  };

  // Mutator: Update Stage Names
  const handleUpdateStageName = (stageId: string, name: string) => {
    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      pipelines: b.pipelines.map(p => ({
        ...p,
        stages: p.stages.map(s => s.id === stageId ? { ...s, name } : s)
      }))
    }));
  };

  // Mutator: Update Stage Rotting Window
  const handleUpdateRottenDays = (stageId: string, days: number | null) => {
    setCatalog(prev => prev.map(b => b.id !== selectedBlueprintId ? b : {
      ...b,
      pipelines: b.pipelines.map(p => ({
        ...p,
        stages: p.stages.map(s => s.id === stageId ? { ...s, rottenDays: days } : s)
      }))
    }));
  };

  // Mutator: Add Custom Option to Dropdown Dictionary
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

  // Mutator: Remove Option from Dropdown Dictionary
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
    <div className="max-w-full mx-auto flex bg-[#f3f4f6] dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 min-h-[700px] overflow-hidden shadow-md font-sans">
      
      {/* 1. Pipedrive Native Left Navigation Strip Mirror */}
      <div className="w-14 bg-[#262f3d] flex flex-col items-center py-4 space-y-4 shrink-0">
        <div className="h-7 w-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">P</div>
        <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-sm cursor-pointer border border-white/5">💲</div>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm cursor-pointer opacity-60 hover:opacity-100">📅</div>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm cursor-pointer opacity-60 hover:opacity-100">👥</div>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm cursor-pointer opacity-60 hover:opacity-100">📊</div>
      </div>

      {/* 2. Main Pipedrive Dashboard View Frame Component */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-900">
        
        {/* Top Header Controls Toolbar Strip */}
        <div className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-4">
            
            {/* Blueprint Selector menu dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Blueprint:</span>
              <select
                value={selectedBlueprintId}
                onChange={(e) => switchBlueprint(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1 text-xs font-bold focus:outline-none"
              >
                {catalog.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Pipeline Select Node Option */}
            <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-zinc-800 pl-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Pipeline:</span>
              <select
                value={activePipelineId}
                onChange={(e) => setActivePipelineId(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1 text-xs font-extrabold text-slate-800 dark:text-zinc-200 focus:outline-none"
              >
                {currentBlueprint.pipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons wrapper matching Pipedrive styles */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsFieldsModalOpen(true)}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 px-3 py-1.5 rounded text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition"
            >
              <span>⚙️</span>
              <span>Fields ({currentBlueprint.customFields.length})</span>
            </button>

            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${isEditMode ? 'bg-amber-600 border border-amber-700 text-white hover:bg-amber-500' : 'bg-[#3cb371] border border-[#2e8b57] hover:opacity-90 text-white shadow-xs'}`}
            >
              {isEditMode ? "🔒 Exit Editing" : "🛠️ Edit Blueprint"}
            </button>
          </div>
        </div>

        {/* 3. Pipedrive Kanban Board Canvas Lane Section */}
        <div className="flex-1 bg-[#f4f5f6] dark:bg-zinc-950/40 p-6 overflow-x-auto flex items-start space-x-3 scrollbar-thin">
          {currentPipeline.stages.map((stage) => (
            <div key={stage.id} className="w-[220px] shrink-0 flex flex-col space-y-3">
              
              {/* Stage Column Plate Box */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-lg p-3 shadow-xs">
                {isEditMode ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] uppercase font-mono font-bold text-slate-400">Stage Label</label>
                      <input
                        type="text"
                        value={stage.name}
                        onChange={(e) => handleUpdateStageName(stage.id, e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1 text-xs font-bold mt-0.5 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-mono font-bold text-slate-400">Rotting Days</label>
                      <input
                        type="number"
                        placeholder="Disabled"
                        value={stage.rottenDays || ""}
                        onChange={(e) => handleUpdateRottenDays(stage.id, e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1 text-xs font-mono mt-0.5 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate tracking-tight">{stage.name}</h3>
                    <div className="flex justify-between items-center mt-1 text-[10px] font-medium text-slate-400">
                      <span>1 deal</span>
                      {stage.rottenDays && (
                        <span className="text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/40 px-1.5 py-0.5 rounded">
                          ⌛ {stage.rottenDays}d
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mapped Single Sample Deal Container - Clearly Generic */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-lg p-3 shadow-xs flex justify-between items-start">
                <div className="space-y-1 max-w-[85%]">
                  <h4 className="text-[11px] font-bold text-slate-900 dark:text-zinc-100 tracking-tight leading-tight">
                    [Sample] Business Opportunity
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                    👤 Primary Account Contact
                  </p>
                  <span className="inline-block text-[10px] font-mono font-bold text-slate-400">
                    $0
                  </span>
                </div>
                {stage.rottenDays && (
                  <span className="h-3.5 w-3.5 bg-rose-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold animate-pulse shrink-0">
                    !
                  </span>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* 4. Interactive Dictionary Configuration Side Panel Modal */}
      {isFieldsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 max-w-2xl w-full rounded-xl shadow-xl overflow-hidden flex flex-col h-[520px]">
            
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">Custom Dictionary Options</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Blueprint Custom Fields</h3>
              </div>
              <button 
                onClick={() => { setIsFieldsModalOpen(false); setEditingFieldId(null); }}
                className="text-slate-400 hover:text-slate-600 text-xs font-mono font-bold bg-slate-200/50 dark:bg-zinc-800 px-2 py-1 rounded"
              >
                Close
              </button>
            </div>

            {/* Panel Inner Body Grid split */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Side: Fields Registry Array List */}
              <div className="w-1/2 border-r border-slate-200 dark:border-zinc-800 p-4 overflow-y-auto space-y-2 bg-slate-50/50 dark:bg-zinc-950/10">
                {currentBlueprint.customFields.map((field) => (
                  <div
                    key={field.id}
                    onClick={() => setEditingFieldId(field.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${editingFieldId === field.id ? 'border-slate-800 dark:border-zinc-400 bg-white dark:bg-zinc-800 shadow-xs font-semibold' : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-200'}`}
                  >
                    <div className="text-xs text-slate-900 dark:text-zinc-100 flex items-center justify-between">
                      <span>{field.name}</span>
                      {field.type === "dropdown" && <span className="text-[9px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 px-1 rounded font-mono">Options</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono font-normal mt-0.5">{field.scope} • {field.type}</div>
                  </div>
                ))}
              </div>

              {/* Right Side: Mapped Dropdown Attributes Options Editor Panel */}
              <div className="w-1/2 p-5 overflow-y-auto bg-white dark:bg-zinc-900">
                {editingFieldId ? (
                  (() => {
                    const field = currentBlueprint.customFields.find(f => f.id === editingFieldId);
                    if (!field) return null;
                    
                    return (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">{field.name}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">Configure target validation values inside the blueprint.</p>
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

                            {/* Native Pipedrive Styled Form input layout box for additions */}
                            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-1.5">
                              <input
                                type="text"
                                placeholder="Add new selection label..."
                                value={newFieldOption}
                                onChange={(e) => setNewFieldOption(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1.5 text-xs focus:outline-none"
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleAddOptionToField(field.id)}
                                  className="bg-[#3cb371] hover:bg-opacity-90 text-white font-sans font-bold px-2.5 py-1 rounded text-[11px] shadow-xs"
                                >
                                  Save Option
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 font-sans italic pt-12">
                            This field type parameter values are driven globally by standard CRM object formatting rules. No sub-options map required.
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-4 rounded-xl text-center text-xs text-slate-400 font-sans italic pt-24">
                    Select a custom metadata parameter column from the registry to explore its target criteria options tree.
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