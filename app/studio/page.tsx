// app/studio/page.tsx
"use client";

import { useState } from "react";

// Robust Mock Dataset reflecting your live Pipedrive environment image capture
const initialBlueprintsCatalog = [
  {
    id: "rosewood_ops_v1",
    name: "Rosewood Lifecycle Blueprint",
    version: "1.2.0",
    pipelines: [
      {
        id: "pip_1",
        name: "Onboarded Client Pipeline",
        stages: [
          { id: "stg_1", name: "Ongoing Client Relationship", dealsCount: 48, rottenDays: null },
          { id: "stg_2", name: "Strategic Health Review", dealsCount: 0, rottenDays: 7 },
          { id: "stg_3", name: "Annual Strategy Refresh", dealsCount: 0, rottenDays: 7 },
          { id: "stg_4", name: "Account At-Risk", dealsCount: 0, rottenDays: 3 },
          { id: "stg_5", name: "Graduated Client", dealsCount: 0, rottenDays: 1 }
        ],
        deals: [
          { id: "d1", title: "Seven Oaks Landscape/Hardscape", contact: "Allison Welch", value: "$0", alert: "rotten" },
          { id: "d2", title: "Myerstown Sheds & Fencing", contact: "Myerstown Sheds & Fencing", value: "$0", alert: "warning" },
          { id: "d3", title: "Sensenig Manufacturing", contact: "Sensenig Manufacturing", value: "$0", alert: "warning" },
          { id: "d4", title: "Breezy Acres", contact: "Breezy Acres", value: "$0", alert: "warning" },
          { id: "d5", title: "Monarch Rest/Rainbow Bedding Company", contact: "Monarch Rest/Rainbow Bedding Company", value: "$0", alert: "warning" },
          { id: "d6", title: "Stoltfus Hardwoods", contact: "Stoltfus Hardwoods", value: "$0", alert: "warning" },
          { id: "d7", title: "Stoltfus Forest Products", contact: "Stoltfus Forest Products", value: "$0", alert: "warning" },
          { id: "d8", title: "Heartland Mattress LLC", contact: "Heartland Mattress LLC", value: "$0", alert: "warning" },
          { id: "d9", title: "Dwellity", contact: "Dwellity", value: "$0", alert: "warning" },
          { id: "d10", title: "The Olde Sale Barn", contact: "The Olde Sale Barn", value: "$0", alert: "warning" }
        ]
      },
      {
        id: "pip_2",
        name: "Lead to Waitlist Pipeline",
        stages: [
          { id: "stg_6", name: "Initial Contact & Screening", dealsCount: 12, rottenDays: 14 },
          { id: "stg_7", name: "Information Sent", dealsCount: 5, rottenDays: 30 },
          { id: "stg_8", name: "Discovery Scheduling", dealsCount: 2, rottenDays: 7 }
        ],
        deals: [
          { id: "d11", title: "Buckeye Metal Sales", contact: "Marcus Miller", value: "$4,500", alert: "none" }
        ]
      }
    ],
    customFields: [
      { name: "Lead Source Detail", type: "Dropdown Options", scope: "Deals" },
      { name: "Estimated Revenue Block", type: "Monetary Value", scope: "Deals" },
      { name: "Fulfillment Architect Assigned", type: "User Field", scope: "Deals" },
      { name: "Building Dimensions Map", type: "Long Text String", scope: "Organizations" }
    ]
  },
  {
    id: "shed_builder_v1",
    name: "Standard Client Velocity Blueprint",
    version: "1.0.4",
    pipelines: [
      {
        id: "pip_3",
        name: "Inbound Fulfillment Track",
        stages: [
          { id: "stg_9", name: "Intake Captured", dealsCount: 8, rottenDays: null },
          { id: "stg_10", name: "Proposal Dispatched", dealsCount: 3, rottenDays: 5 },
          { id: "stg_11", name: "Contract Finalized", dealsCount: 1, rottenDays: null }
        ],
        deals: [
          { id: "d12", title: "Lancaster Shed Depot", contact: "Ephraim Stoltzfus", value: "$12,800", alert: "none" }
        ]
      }
    ],
    customFields: [
      { name: "Logistics Routing Check", type: "Boolean Flag", scope: "Deals" }
    ]
  }
];

export default function VersionEditor() {
  // Global Catalogs State
  const [catalog, setCatalog] = useState(initialBlueprintsCatalog);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("rosewood_ops_v1");
  const [activePipelineId, setActivePipelineId] = useState("pip_1");
  
  // Working Modes and UI Elements
  const [isEditMode, setIsEditMode] = useState(false);
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");

  // Target current selections dynamically
  const currentBlueprint = catalog.find(b => b.id === selectedBlueprintId) || catalog[0];
  const currentPipeline = currentBlueprint.pipelines.find(p => p.id === activePipelineId) || currentBlueprint.pipelines[0];

  // Helper function to sync changing dropdown values cleanly
  const switchBlueprint = (id: string) => {
    setSelectedBlueprintId(id);
    const targetBlueprint = catalog.find(b => b.id === id);
    if (targetBlueprint && targetBlueprint.pipelines.length > 0) {
      setActivePipelineId(targetBlueprint.pipelines[0].id);
    }
  };

  // State Mutators: Inline Modification handlers
  const updateStageName = (stageId: string, value: string) => {
    setCatalog(prevCatalog => 
      prevCatalog.map(blueprint => {
        if (blueprint.id !== selectedBlueprintId) return blueprint;
        return {
          ...blueprint,
          pipelines: blueprint.pipelines.map(pipeline => ({
            ...pipeline,
            stages: pipeline.stages.map(stage => 
              stage.id === stageId ? { ...stage, name: value } : stage
            )
          }))
        };
      })
    );
  };

  const updateRottenDays = (stageId: string, value: number | null) => {
    setCatalog(prevCatalog => 
      prevCatalog.map(blueprint => {
        if (blueprint.id !== selectedBlueprintId) return blueprint;
        return {
          ...blueprint,
          pipelines: blueprint.pipelines.map(pipeline => ({
            ...pipeline,
            stages: pipeline.stages.map(stage => 
              stage.id === stageId ? { ...stage, rottenDays: value } : stage
            )
          }))
        };
      })
    );
  };

  const handleAddStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;

    const spawnId = "stg_" + Date.now();
    setCatalog(prevCatalog => 
      prevCatalog.map(blueprint => {
        if (blueprint.id !== selectedBlueprintId) return blueprint;
        return {
          ...blueprint,
          pipelines: blueprint.pipelines.map(pipeline => {
            if (pipeline.id !== activePipelineId) return pipeline;
            return {
              ...pipeline,
              stages: [...pipeline.stages, { id: spawnId, name: newStageName, dealsCount: 0, rottenDays: null }]
            };
          })
        };
      })
    );
    setNewStageName("");
  };

  const handleDeleteStage = (stageId: string) => {
    setCatalog(prevCatalog => 
      prevCatalog.map(blueprint => {
        if (blueprint.id !== selectedBlueprintId) return blueprint;
        return {
          ...blueprint,
          pipelines: blueprint.pipelines.map(pipeline => ({
            ...pipeline,
            stages: pipeline.stages.filter(stage => stage.id !== stageId)
          }))
        };
      })
    );
  };

  return (
    <div className="max-w-full mx-auto space-y-4 font-sans select-none animate-fade-in text-zinc-800 dark:text-zinc-100">
      
      {/* Top Application Ribbon (Pipedrive System Styled Layout) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm transition-colors">
        <div className="flex items-center space-x-4">
          
          {/* Blueprint Selector Configuration Item Menu */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-zinc-500 font-bold">Blueprint Schema</span>
            <select
              value={selectedBlueprintId}
              onChange={(e) => switchBlueprint(e.target.value)}
              className="mt-0.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {catalog.map(b => (
                <option key={b.id} value={b.id}>{b.name} (v{b.version})</option>
              ))}
            </select>
          </div>

          {/* Active Target Pipeline Dropdown Element */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-zinc-500 font-bold">Active Pipeline View</span>
            <select
              value={activePipelineId}
              onChange={(e) => setActivePipelineId(e.target.value)}
              className="mt-0.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none"
            >
              {currentBlueprint.pipelines.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Action Parameter Controls Block */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsFieldsModalOpen(true)}
            className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 text-slate-700 dark:text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-medium font-sans flex items-center space-x-2 transition"
          >
            <span>⚙️</span>
            <span>View Custom Fields ({currentBlueprint.customFields.length})</span>
          </button>

          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-sans transition flex items-center space-x-2 border shadow-sm ${isEditMode ? 'bg-amber-600 border-amber-700 text-white hover:bg-amber-500' : 'bg-slate-900 border-slate-950 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-90'}`}
          >
            <span>{isEditMode ? "🔒 Save Schema" : "🛠️ Edit Blueprint Mode"}</span>
          </button>
        </div>
      </div>

      {/* Interactive Mock Pipeline Board (Pipedrive UI Layout Approximation) */}
      <div className="w-full bg-[#f4f5f6] dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-900/60 rounded-xl p-4 overflow-x-auto min-h-[580px] shadow-inner transition-colors flex items-start space-x-3 scrollbar-thin">
        
        {/* Dynamic Map iteration of pipelines structural stages list */}
        {currentPipeline.stages.map((stage) => (
          <div key={stage.id} className="w-[240px] shrink-0 flex flex-col space-y-2 animate-fade-in">
            
            {/* Stage Header Info Plate Block */}
            <div className="bg-white/80 dark:bg-zinc-900/60 border border-slate-200/60 dark:border-zinc-800/40 rounded-xl p-3 shadow-sm group">
              {isEditMode ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={stage.name}
                    onChange={(e) => updateStageName(stage.id, e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1 text-xs font-bold"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1">
                      <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Rotten (d):</span>
                      <input
                        type="number"
                        placeholder="None"
                        value={stage.rottenDays || ""}
                        onChange={(e) => updateRottenDays(stage.id, e.target.value ? parseInt(e.target.value) : null)}
                        className="w-12 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-[10px] font-mono"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleDeleteStage(stage.id)}
                      className="text-[10px] text-rose-500 hover:underline font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-bold font-sans tracking-tight text-slate-900 dark:text-zinc-100 truncate">
                    {stage.name}
                  </h3>
                  <div className="flex justify-between items-center mt-1 text-[10px] font-mono text-slate-400 dark:text-zinc-500 font-medium">
                    <span>{stage.dealsCount} deals</span>
                    {stage.rottenDays && (
                      <span className="text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 px-1.5 py-0.5 rounded">
                        ⚠️ Rotten: {stage.rottenDays}d
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Stage Cards Flow (Only showing mapped items inside the active preview segment view) */}
            <div className="space-y-2 overflow-y-auto max-h-[460px] pr-0.5 scrollbar-none">
              {stage.id === "stg_1" && currentPipeline.deals ? (
                currentPipeline.deals.map((deal) => (
                  <div key={deal.id} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-lg p-3 shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 transition flex justify-between items-start group">
                    <div className="space-y-1 max-w-[85%]">
                      <h4 className="text-[11px] font-bold text-slate-900 dark:text-zinc-100 leading-tight font-sans tracking-tight group-hover:text-slate-900 break-words">
                        {deal.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate font-medium">
                        👤 {deal.contact}
                      </p>
                      <span className="inline-block text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500">
                        {deal.value}
                      </span>
                    </div>

                    {/* Target Specific Warning Flag nodes derived from image capture metrics layout blueprint */}
                    {deal.alert === "rotten" && (
                      <span className="h-4 w-4 bg-rose-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold shrink-0 shadow-sm animate-pulse">
                        ‹
                      </span>
                    )}
                    {deal.alert === "warning" && (
                      <span className="h-4 w-4 border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                        ⚠
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-slate-200 dark:border-zinc-900 rounded-lg p-6 text-center text-[10px] text-slate-300 font-mono italic">
                  No Active Deals
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Inline Append Node Interface box activated explicitly when Edit mode runs */}
        {isEditMode && (
          <form onSubmit={handleAddStage} className="w-[240px] shrink-0 bg-white/40 dark:bg-zinc-900/20 border border-dashed border-slate-300 dark:border-zinc-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold font-sans text-slate-500">New Stage Construct</h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter stage label description..."
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newStageName.trim()}
                className="w-full bg-slate-800 text-white dark:bg-zinc-100 dark:text-zinc-950 font-sans font-bold py-1.5 px-3 rounded-lg text-xs hover:opacity-90 disabled:opacity-30 transition"
              >
                + Add Pipeline Stage
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Modular Schema Panel Overlays: Custom Fields Registry Dictionary */}
      {isFieldsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 max-w-xl w-full rounded-2xl shadow-xl overflow-hidden transition-all">
            <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">Architecture Fields Manifest</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">Package Metadata Options Dictionary</h3>
              </div>
              <button 
                onClick={() => setIsFieldsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-mono font-bold bg-slate-200/50 dark:bg-zinc-800 px-2 py-1 rounded"
              >
                Close_Window
              </button>
            </div>
            <div className="p-6 space-y-3 max-h-[380px] overflow-y-auto scrollbar-thin">
              {currentBlueprint.customFields.map((field, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800/60 text-xs font-sans">
                  <div className="flex items-center space-x-3 font-medium text-slate-800 dark:text-zinc-200">
                    <span className="text-slate-400">🏷️</span>
                    <span>{field.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono text-[10px]">
                    <span className="bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-0.5 rounded">Scope: {field.scope}</span>
                    <span className="bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 px-2 py-0.5 rounded font-bold">{field.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}