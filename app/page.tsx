"use client";

import { useState } from "react";

export default function Launchpad() {
  // Application Dynamic State
  const [apiToken, setApiToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [targetCompany, setTargetCompany] = useState<string | null>(null);
  const [targetAdmin, setTargetAdmin] = useState<string | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState("rosewood_core_v1.2");
  
  // Extension Settings Options
  const [extensions, setExtensions] = useState({
    highVolume: true,
    outsideSales: false,
    smsAlerts: false,
    retentionCare: false,
  });

  // Logging Deployment System State
  const [isDeploying, setIsDeploying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleToggle = (key: keyof typeof extensions) => {
    setExtensions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Secure Target Validation Mock
  const handleVerifyTarget = () => {
    if (!apiToken) {
      alert("Please enter a valid REST API Token to establish an infrastructure tunnel.");
      return;
    }
    setIsVerifying(true);
    
    setTimeout(() => {
      setIsVerifying(false);
      setTargetCompany("Buckeye Metal Sales");
      setTargetAdmin("John Doe (System Admin)");
    }, 1100);
  };

  // Atomic Compiled Build Loop Simulation
  const handleDeploy = () => {
    if (!targetCompany) return;
    setIsDeploying(true);
    setLogs([]);

    const steps = [
      "Initial validation check successfully parsed.",
      "Established secure handshake authentication window with target API server.",
      "Mapping global image layer: Rosewood Baseline System v1.2...",
      "Programmatically deploying Custom Field Dictionary structures (14 core modules).",
      "Injecting global closed-lost justification keys across environment dictionaries.",
      "Analyzing optional feature extensions criteria manifest...",
      extensions.highVolume ? "Appending Module: High-Volume Velocity Lead Tracking Workflow." : null,
      extensions.outsideSales ? "Appending Module: Outside-Sales Field Mapping Geolocation Track." : null,
      extensions.smsAlerts ? "Appending Module: Trigger layer mapping to Twilio Broadcast Webhooks." : null,
      "Activating real-time server webhook diagnostics listeners.",
      "Compiling configuration operational manuals inside The Vault module.",
      "Deployment success. Target workspace is fully hardened and live."
    ].filter(Boolean) as string[];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setLogs(prev => [...prev, step]);
        if (index === steps.length - 1) {
          setIsDeploying(false);
        }
      }, (index + 1) * 450);
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Title / Description */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-sans">Deployment Launchpad</h1>
        <p className="text-zinc-500 text-sm mt-1.5 font-normal max-w-2xl leading-relaxed">
          Declare runtime connection vectors, attach optional feature extensions, and compile deterministic workspace architectures cleanly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Configurations Pane */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Handshake Target Authentication */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase text-indigo-600 tracking-wider">01 / Connection Tunnel</span>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-600">Pipedrive Account REST API Token</label>
              <div className="flex space-x-3">
                <input 
                  type="password" 
                  placeholder="Paste private environment security string..."
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  disabled={!!targetCompany}
                  className="flex-1 bg-zinc-50/50 border border-zinc-200 rounded-lg px-4 py-2.5 text-sm font-mono text-zinc-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-40"
                />
                {!targetCompany ? (
                  <button 
                    onClick={handleVerifyTarget}
                    disabled={isVerifying}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium px-5 py-2.5 rounded-lg text-sm shadow-sm transition-all duration-150 disabled:opacity-40"
                  >
                    {isVerifying ? "Verifying..." : "Connect Target"}
                  </button>
                ) : (
                  <button 
                    onClick={() => { setTargetCompany(null); setTargetAdmin(null); setApiToken(""); setLogs([]); }}
                    className="bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-all"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* Premium Connected Badge Alert Block */}
            {targetCompany && (
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex justify-between items-center transition-all duration-300">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Target Verified</div>
                    <div className="text-sm font-bold text-emerald-900 mt-0.5">{targetCompany}</div>
                  </div>
                </div>
                <div className="text-right text-xs text-emerald-800/80 bg-emerald-100/50 px-3 py-1.5 border border-emerald-200/40 rounded-lg font-medium">
                  Verified via: <span className="font-semibold">{targetAdmin}</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Blueprint Architecture Construction */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-6">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase text-indigo-600 tracking-wider">02 / Configuration Manifest</span>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-600">Universal Baseline Architecture Core</label>
              <select 
                value={selectedBlueprint}
                onChange={(e) => setSelectedBlueprint(e.target.value)}
                className="w-full bg-zinc-50/50 border border-zinc-200 rounded-lg px-4 py-3 text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="rosewood_core_v1.2">Rosewood Immutable Core Baseline Image v1.2</option>
                <option value="rosewood_core_v1.3_beta">Rosewood Immutable Core Baseline Image v1.3 (Beta Evaluation)</option>
              </select>
            </div>

            {/* Grid Toggle Elements */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-600">Declarative Extension Modules</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Module Item 1 */}
                <div 
                  onClick={() => handleToggle("highVolume")}
                  className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all duration-200 ${extensions.highVolume ? 'border-indigo-600 bg-indigo-50/10 shadow-sm' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-zinc-800">High-Volume Distribution</div>
                    <div className="text-xs text-zinc-400 font-normal">Adds rapid lead pipeline nodes and automation templates</div>
                  </div>
                  <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition ${extensions.highVolume ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-300'}`}>
                    {extensions.highVolume && <span className="text-xs">✓</span>}
                  </div>
                </div>

                {/* Module Item 2 */}
                <div 
                  onClick={() => handleToggle("outsideSales")}
                  className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all duration-200 ${extensions.outsideSales ? 'border-indigo-600 bg-indigo-50/10 shadow-sm' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-zinc-800">Outside-Sales System</div>
                    <div className="text-xs text-zinc-400 font-normal">Appends geographic mapping inputs and follow-up loops</div>
                  </div>
                  <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition ${extensions.outsideSales ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-300'}`}>
                    {extensions.outsideSales && <span className="text-xs">✓</span>}
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Right Active Pipeline Activity Panel */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 flex flex-col justify-between space-y-6 h-full min-h-[440px]">
          <div className="space-y-4 flex-1 flex flex-col">
            <span className="text-xs font-mono font-bold uppercase text-indigo-600 tracking-wider">03 / Compilation Monitor</span>
            
            {/* Clean, Non-terminal Build Tracker Feed */}
            <div className="flex-1 rounded-xl bg-zinc-50 border border-zinc-200 p-4 overflow-y-auto space-y-3 shadow-inner max-h-[360px]">
              {logs.length === 0 ? (
                <div className="text-zinc-400 italic text-xs font-sans text-center mt-12">
                  Infrastructure compilation engine idle. Connect environment target to unlock build panel.
                </div>
              ) : (
                <div className="space-y-2.5 font-sans text-xs">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-start space-x-3 text-zinc-600 animate-fade-in">
                      <span className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${log.includes("success") || log.includes("live") ? "bg-emerald-500" : "bg-indigo-500"}`} />
                      <span className={log.includes("success") || log.includes("live") ? "text-emerald-700 font-medium" : "text-zinc-600"}>
                        {log}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {isDeploying && (
                <div className="flex items-center space-x-2 text-xs font-medium text-amber-600 mt-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="italic font-normal text-zinc-400">Executing serverless runtime sequences...</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={handleDeploy}
            disabled={!targetCompany || isDeploying}
            className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 text-white font-sans font-semibold py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.99]"
          >
            {isDeploying ? "Compiling..." : targetCompany ? "⚡ Execute Atomic Deploy" : "Lock Target to Deploy"}
          </button>
        </div>
      </div>
    </div>
  );
}