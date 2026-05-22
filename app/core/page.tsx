// app/core/page.tsx
"use client";

export default function CoreImages() {
  const nativePrimitives = [
    { name: "Deals Layer", description: "Standard sales value cards, value trackers, and core status vectors (Open, Won, Lost)." },
    { name: "Persons Layer", description: "Native customer contact mapping, personal communication histories, and touchpoints." },
    { name: "Organizations Layer", description: "B2B company boundaries, parent-subsidiary associations, and address logs." },
    { name: "Activities Layer", description: "Standard timeline tasks, default calendar types (Call, Meeting, Task, Email)." }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 font-sans">Core Standards</h1>
        <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1.5 font-normal max-w-2xl leading-relaxed">
          Review the system's baseline invariants. Currently running on standard platform primitives with zero forced mutations.
        </p>
      </div>

      {/* Blueprint Summary Card */}
      <div className="bg-white border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl shadow-sm p-6 flex justify-between items-center">
        <div>
          <span className="text-xs font-mono font-bold uppercase text-slate-500 dark:text-zinc-400 tracking-wider">Active Baseline Image</span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 mt-1">Vanilla Pipedrive Environment</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xl">
            Relying entirely on out-of-the-box platform records. Custom architectures are applied cleanly as decoupled modular layers during compilation.
          </p>
        </div>
        <div className="text-right font-mono text-xs border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2 bg-slate-50 dark:bg-zinc-950">
          <div className="text-slate-400 dark:text-zinc-500 font-bold uppercase text-[10px]">Image State</div>
          <div className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">PRISTINE_BASE</div>
        </div>
      </div>

      {/* Native Object Tables Checklist */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Verified Native Primitives</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nativePrimitives.map((primitive, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex items-start space-x-4">
              <div className="h-5 w-5 rounded-md border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 flex items-center justify-center text-xs text-slate-500 dark:text-zinc-300 font-bold">
                ✓
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-slate-800 dark:text-zinc-200">{primitive.name}</div>
                <div className="text-xs text-slate-400 dark:text-zinc-500 font-normal leading-relaxed">{primitive.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}