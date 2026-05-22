// app/studio/page.tsx
"use client";

import { useState } from "react";

// Packaged Modular Blueprint Definitions
const blueprintsCatalog = [
  {
    id: "rosewood_internal_ops",
    name: "Rosewood Corporate Blueprint Package",
    version: "1.2.0",
    description: "Multi-pipeline client lifecycle model managing accounts from intake screening through graduation tracks.",
    pipelines: [
      { name: "Lead to Waitlist", stages: ["Initial Contact & Screening", "Information Sent, Pending Response", "Discovery Call Scheduling", "Sales & Qualification Phase", "\"Won\" Opportunity", "Long Term Leads", "Client Lost"] },
      { name: "Waitlist to Onboarding", stages: ["The Waitlist (Nurture Phase)", "Pre-Onboarding & Team Assignment", "MSC Scheduling & Internal Setup", "Phase 1 Onboarding - MSC", "Phase 2 Onboarding - Core Messaging", "Onboarded Client"] },
      { name: "Onboarded Client", stages: ["Ongoing Client Relationship", "Strategic Health Review", "Annual Strategy Refresh", "Account At-Risk", "Graduated Client"] },
      { name: "Post Graduation & Legacy Clients", stages: ["Graduated - Evaluate Client Status", "Graduated - Warm Referral Partner", "Graduated - Recovery Evaluation", "Intermittent Project Work", "Inactive - No Further Contact"] }
    ]
  },
  {
    id: "high_volume_distribution",
    name: "Velocity Sales Blueprint Package",
    version: "1.0.4",
    description: "High-density lead environment designed for rapid inbound quote tracking and high-frequency dispatch rules.",
    pipelines: [
      { name: "Inbound Pipeline", stages: ["Intake Captured", "Contact Attempted", "Details Verified", "Proposal Sent", "Closed Won", "Closed Lost"] }
    ]
  }
];

export default function FeatureStudio() {
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("rosewood_internal_ops");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAltering, setIsAltering] = useState(false);

  // Find active blueprint tracking criteria
  const activeBlueprint = blueprintsCatalog.find(b => b.id === selectedBlueprintId) || blueprintsCatalog[0];

  const handleAiMutation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt) return;
    setIsAltering(true);
    setTimeout(() => {
      setIsAltering(false);
      alert("AI Schema Morpher complete. Custom parameters generated.");
      setAiPrompt("");
    }, 1200);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 font-sans">Feature Studio</h1>
        <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1.5 font-normal max-w-2xl leading-relaxed">
          Manage declarative blueprint packages and apply custom client mutations dynamically using the integrated AI Schema Morpher.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Package Navigator & AI Prompt Box */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Blueprint Package Selector Card */}
          <div className="bg-white border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl shadow-sm p-5 space-y-4">
            <span className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Select Blueprint Package</span>
            <div className="space-y-2">
              {blueprintsCatalog.map((blueprint) => (
                <div
                  key={blueprint.id}
                  onClick={() => setSelectedBlueprintId(blueprint.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-150 ${selectedBlueprintId === blueprint.id ? 'border-slate-800 dark:border-zinc-300 bg-slate-50 dark:bg-zinc-800/40 font-semibold' : 'border-slate-100 dark:border-zinc-900 bg-white dark:bg-zinc-900 hover:border-slate-200 dark:hover:border-zinc-800'}`}
                >
                  <div className="text-xs text-slate-800 dark:text-zinc-200">{blueprint.name}</div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono font-normal mt-0.5">v{blueprint.version}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Schema Morpher Console Card */}
          <form onSubmit={handleAiMutation} className="bg-white border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl shadow-sm p-5 space-y-4">
            <span className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">AI Schema Morpher</span>
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-relaxed font-sans">
                Type plain-English modifications. The agent will alter the raw structural configurations before compilation.
              </p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., Add a pipeline stage named 'CAD Design' right after Proposal Sent and include a custom text field..."
                rows={4}
                className="w-full bg-slate-50/50 border border-slate-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-lg p-3 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-500 dark:text-zinc-200 shadow-inner resize-none"
              />
              <button
                type="submit"
                disabled={isAltering || !aiPrompt}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-white font-sans font-semibold py-2 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm transition disabled:opacity-30"
              >
                {isAltering ? "Altering Blueprint..." : "🤖 Apply Custom Tweak"}
              </button>
            </div>
          </form>

        </div>

        {/* Right Side: Render Active Package Pipelines/Stages */}
        <div className="lg:col-span-2 bg-white border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl shadow-sm p-6 space-y-6 transition-all">
          <div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
              Active Selection Structure
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mt-2">{activeBlueprint.name}</h2>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 max-w-xl font-normal leading-relaxed">{activeBlueprint.description}</p>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
            {activeBlueprint.pipelines.map((pipeline, idx) => (
              <div key={idx} className="border border-slate-100 dark:border-zinc-800 rounded-xl p-4 space-y-3 bg-slate-50/40 dark:bg-zinc-950/20">
                <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-300 flex items-center space-x-2">
                  <span className="font-mono font-normal text-slate-400 dark:text-zinc-500">[{idx}]</span>
                  <span>{pipeline.name}</span>
                </h3>
                
                {/* Horizontal flow line of steps */}
                <div className="flex flex-wrap gap-2">
                  {pipeline.stages.map((stage, sIdx) => (
                    <div key={sIdx} className="flex items-center space-x-2">
                      <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 font-sans text-[11px] font-medium text-slate-700 dark:text-zinc-300 shadow-sm">
                        {stage}
                      </div>
                      {sIdx < pipeline.stages.length - 1 && (
                        <span className="text-slate-300 dark:text-zinc-700 font-mono text-xs select-none">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}