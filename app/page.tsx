"use client";

import { useState } from "react";

export default function Launchpad() {
  // App Control States
  const [apiToken, setApiToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [targetCompany, setTargetCompany] = useState<string | null>(null);
  const [targetAdmin, setTargetAdmin] = useState<string | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState("rosewood_core_v1.2");
  
  // Extension Settings
  const [extensions, setExtensions] = useState({
    highVolume: true,
    outsideSales: false,
    smsAlerts: false,
    retentionCare: false,
  });

  // Logging Console States
  const [isDeploying, setIsDeploying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleToggle = (key: keyof typeof extensions) => {
    setExtensions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Three-Factor Handshake Verification Loop
  const handleVerifyTarget = () => {
    if (!apiToken) {
      alert("Please enter a token to establish connection.");
      return;
    }
    setIsVerifying(true);
    
    setTimeout(() => {
      setIsVerifying(false);
      setTargetCompany("Buckeye Metal Sales");
      setTargetAdmin("John Doe (Admin Key)");
    }, 1000);
  };

  // Compile & Deployment Script Simulator
  const handleDeploy = () => {
    if (!targetCompany) return;
    setIsDeploying(true);
    setLogs([]);

    const runSteps = [
      "INIT: Fetching compiled manifest layout maps...",
      "AUTH: Verifying active session handshake protocols...",
      "IMAGE: Mapping master target: Rosewood Core Standard v1.2...",
      "POST: Seeding default Custom Deal Field Dictionary (14 entries)... Done.",
      "POST: Mapping uniform Closed-Lost terminal categories... Done.",
      "COMPILING: Evaluating configuration matrix parameters...",
      extensions.highVolume ? "LAYER: Building High-Volume Workflow Pipeline Nodes..." : null,
      extensions.outsideSales ? "LAYER: Appending Geographic Mapping Nurture Tracks..." : null,
      extensions.smsAlerts ? "LAYER: Linking real-time broker communication triggers..." : null,
      "WEBHOOK: Injecting active REST API callback monitors...",
      "DOCS: Compiling reference files inside the internal vault data branch...",
      "SUCCESS: Target configuration deployed. Environment is live."
    ].filter(Boolean) as string[];

    runSteps.forEach((step, index) => {
      setTimeout(() => {
        setLogs(prev => [...prev, `> ${step}`]);
        if (index === runSteps.length - 1) {
          setIsDeploying(false);
        }
      }, (index + 1) * 500);
    });
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-mono font-bold text-slate-100">01 // THE LAUNCHPAD</h1>
        <p className="text-slate-400 text-sm mt-0.5">Declare parameters, configure optional runtime packages, and execute target environment deployments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configurations View */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Target Verification Card */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Section 01 / Target Authentication</h2>
            
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-400">Pipedrive Token Input String</label>
              <div className="flex space-x-2">
                <input 
                  type="password" 
                  placeholder="e.g. 48f9a2b84cd71a3e..."
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  disabled={!!targetCompany}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                {!targetCompany ? (
                  <button 
                    onClick={handleVerifyTarget}
                    disabled={isVerifying}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-mono font-bold transition disabled:opacity-50"
                  >
                    {isVerifying ? "Verifying..." : "Verify_Target"}
                  </button>
                ) : (
                  <button 
                    onClick={() => { setTargetCompany(null); setTargetAdmin(null); setApiToken(""); setLogs([]); }}
                    className="bg-slate-900 border border-rose-800 text-rose-400 px-4 py-2 rounded-lg text-xs font-mono font-bold hover:bg-rose-950/20 transition"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {targetCompany && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg flex justify-between items-center">
                <div>
                  <div className="text-[11px] font-mono text-slate-400">Environment Active Lock:</div>
                  <div className="text-sm font-mono font-bold text-emerald-400">{targetCompany}</div>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-400">
                  <div>Verification Owner:</div>
                  <div className="text-slate-300">{targetAdmin}</div>
                </div>
              </div>
            )}
          </div>

          {/* Core Configuration Parameters Selection */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">Section 02 / Core Selection & Modules</h2>
            
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-400">Immutable Architecture Image Base</label>
              <select 
                value={selectedBlueprint}
                onChange={(e) => setSelectedBlueprint(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="rosewood_core_v1.2">Rosewood Standard Baseline Image v1.2</option>
                <option value="rosewood_core_v1.3_beta">Rosewood Standard Baseline Image v1.3 (Beta)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-slate-400">Append Extension Features</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                <div 
                  onClick={() => handleToggle("highVolume")}
                  className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${extensions.highVolume ? 'border-blue-500 bg-blue-950/10' : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'}`}
                >
                  <div>
                    <div className="text-xs font-mono font-bold">High-Volume Distribution</div>
                    <div className="text-[10px] text-slate-400 font-mono">Velocity intake lead rules</div>
                  </div>
                  <div className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${extensions.highVolume ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700'}`}>
                    {extensions.highVolume && "✓"}
                  </div>
                </div>

                <div 
                  onClick={() => handleToggle("outsideSales")}
                  className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${extensions.outsideSales ? 'border-blue-500 bg-blue-950/10' : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'}`}
                >
                  <div>
                    <div className="text-xs font-mono font-bold">Outside-Sales Tracks</div>
                    <div className="text-[10px] text-slate-400 font-mono">Geographic follow-up loops</div>
                  </div>
                  <div className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${extensions.outsideSales ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700'}`}>
                    {extensions.outsideSales && "✓"}
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Execution Compiler Output Monitor Console */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col justify-between space-y-4">
          <div className="space-y-3 flex-1 flex flex-col">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500">Section 03 / Compile Dashboard</h2>
            
            <div className="flex-1 min-h-[240px] rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-[11px] text-slate-300 overflow-y-auto space-y-1">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic">Compiler status: IDLE. Clear for transmission...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={log.includes("SUCCESS") ? "text-emerald-400 font-bold" : log.includes("LAYER") ? "text-blue-400" : "text-slate-300"}>
                    {log}
                  </div>
                ))
              )}
              {isDeploying && <div className="text-amber-500 animate-pulse">Processing execution stacks...</div>}
            </div>
          </div>

          <button
            onClick={handleDeploy}
            disabled={!targetCompany || isDeploying}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:opacity-30 text-slate-950 font-mono font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition"
          >
            {isDeploying ? "Deploying..." : targetCompany ? "⚡ Run Atomic Compilation" : "🔒 Awaiting Handshake Lock"}
          </button>
        </div>
      </div>
    </div>
  );
}