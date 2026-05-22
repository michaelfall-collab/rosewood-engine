// app/core/page.tsx
"use client";

// The Immutable Baseline Architecture configuration is baked directly into the code
// to guarantee deterministic paths and 100% build reliability on Vercel.
const coreBlueprint = {
  id: "rosewood_internal_lifecycle",
  version: "1.2.0",
  name: "Rosewood Corporate Core Architecture",
  description: "Internal multi-pipeline customer journey from intake verification through legacy graduation tracks.",
  pipelines: [
    {
      name: "Lead to Waitlist",
      order_nr: 0,
      deal_probability: false,
      stages: [
        { name: "Initial Contact & Screening", order_nr: 1, deal_probability: 100, rotten_flag: true, rotten_days: 14 },
        { name: "Information Sent, Pending Response", order_nr: 2, deal_probability: 100, rotten_flag: true, rotten_days: 30 },
        { name: "Discovery Call Scheduling", order_nr: 3, deal_probability: 100, rotten_flag: true, rotten_days: 7 },
        { name: "Sales & Qualification Phase", order_nr: 4, deal_probability: 100, rotten_flag: true, rotten_days: 7 },
        { name: "\"Won\" Opportunity", order_nr: 5, deal_probability: 100, rotten_flag: true, rotten_days: 1 },
        { name: "Long Term Leads", order_nr: 6, deal_probability: 100, rotten_flag: false, rotten_days: null },
        { name: "Client Lost", order_nr: 7, deal_probability: 100, rotten_flag: false, rotten_days: null }
      ]
    },
    {
      name: "Waitlist to Onboarding",
      order_nr: 1,
      deal_probability: true,
      stages: [
        { name: "The Waitlist (Nurture Phase)", order_nr: 1, deal_probability: 100, rotten_flag: false, rotten_days: null },
        { name: "Pre-Onboarding & Team Assignment", order_nr: 2, deal_probability: 100, rotten_flag: true, rotten_days: 7 },
        { name: "MSC Scheduling & Internal Setup", order_nr: 3, deal_probability: 100, rotten_flag: true, rotten_days: 21 },
        { name: "Phase 1 Onboarding - MSC", order_nr: 4, deal_probability: 100, rotten_flag: true, rotten_days: 35 },
        { name: "Phase 2 Onboarding - Core Messaging", order_nr: 5, deal_probability: 100, rotten_flag: true, rotten_days: 14 },
        { name: "Onboarded Client", order_nr: 6, deal_probability: 100, rotten_flag: true, rotten_days: 1 }
      ]
    },
    {
      name: "Onboarded Client",
      order_nr: 3,
      deal_probability: true,
      stages: [
        { name: "Ongoing Client Relationship", order_nr: 1, deal_probability: 100, rotten_flag: false, rotten_days: null },
        { name: "Strategic Health Review", order_nr: 2, deal_probability: 100, rotten_flag: true, rotten_days: 7 },
        { name: "Annual Strategy Refresh", order_nr: 3, deal_probability: 100, rotten_flag: true, rotten_days: 7 },
        { name: "Account At-Risk", order_nr: 4, deal_probability: 100, rotten_flag: true, rotten_days: 3 },
        { name: "Graduated Client", order_nr: 5, deal_probability: 100, rotten_flag: true, rotten_days: 1 }
      ]
    },
    {
      name: "Post Graduation & Legacy Clients",
      order_nr: 4,
      deal_probability: false,
      stages: [
        { name: "Graduated - Evaluate Client Status", order_nr: 1, deal_probability: 100, rotten_flag: true, rotten_days: 3 },
        { name: "Graduated - Warm Referral Partner", order_nr: 2, deal_probability: 100, rotten_flag: false, rotten_days: null },
        { name: "Graduated - Recovery Evaluation", order_nr: 3, deal_probability: 100, rotten_flag: false, rotten_days: null },
        { name: "Intermittent Project Work", order_nr: 4, deal_probability: 100, rotten_flag: false, rotten_days: null },
        { name: "Inactive - No Further Contact", order_nr: 5, deal_probability: 100, rotten_flag: false, rotten_days: null }
      ]
    }
  ]
};

export default function CoreImages() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Title block */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 font-sans">Core Standards</h1>
        <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1.5 font-normal max-w-2xl leading-relaxed">
          Review the non-negotiable data standards and immutable baseline architectures forced across all target deployments.
        </p>
      </div>

      {/* Blueprint Summary Card */}
      <div className="bg-white border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl shadow-sm p-6 flex justify-between items-center">
        <div>
          <span className="text-xs font-mono font-bold uppercase text-slate-500 dark:text-zinc-400 tracking-wider">Active Standard Image Base</span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mt-1">{coreBlueprint.name}</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xl">{coreBlueprint.description}</p>
        </div>
        <div className="text-right font-mono text-xs border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2 bg-slate-50 dark:bg-zinc-950">
          <div className="text-slate-400 dark:text-zinc-500 font-bold uppercase text-[10px]">Image Version</div>
          <div className="text-slate-800 dark:text-zinc-200 font-bold mt-0.5">{coreBlueprint.version}</div>
        </div>
      </div>

      {/* Dynamic Pipelines Grid */}
      <div className="space-y-6">
        <h3 className="text-xs font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Compiled Pipelines ({coreBlueprint.pipelines.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {coreBlueprint.pipelines.map((pipeline, i) => (
            <div key={i} className="bg-white border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
                  <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono font-normal">[{pipeline.order_nr}]</span>
                  <span>{pipeline.name}</span>
                </h4>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${pipeline.deal_probability ? 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-300' : 'bg-slate-50 dark:bg-zinc-950 text-slate-400 dark:text-zinc-500'}`}>
                  {pipeline.deal_probability ? "PROB_WEIGHTED" : "STANDARD_TRACK"}
                </span>
              </div>

              {/* Individual Pipeline Stages */}
              <div className="space-y-2">
                {pipeline.stages.map((stage, j) => (
                  <div key={j} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/60 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-900 text-xs font-medium">
                    <div className="flex items-center space-x-3 text-slate-700 dark:text-zinc-300">
                      <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 bg-slate-200/50 dark:bg-zinc-800 h-5 w-5 rounded-md flex items-center justify-center font-bold">
                        {stage.order_nr}
                      </span>
                      <span>{stage.name}</span>
                    </div>
                    {stage.rotten_flag && stage.rotten_days && (
                      <span className="text-[10px] font-mono bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/60 dark:text-amber-400 px-2 py-0.5 rounded font-medium">
                        Rotten: {stage.rotten_days}d
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}