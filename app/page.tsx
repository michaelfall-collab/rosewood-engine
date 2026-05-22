"use client";

import { useState } from "react";

export default function Launchpad() {
  // Application Dynamic Component State
  const [apiToken, setApiToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [targetCompany, setTargetCompany] = useState<string | null>(null);
  const [targetAdmin, setTargetAdmin] = useState<string | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState("rosewood_core_v1.2");
  
  // Extension Settings Matrix
  const [extensions, setExtensions] = useState({
    highVolume: true,
    outsideSales: false,
    smsAlerts: false,
    retentionCare: false,
  });

  // Logging Streams Monitor State
  const [isDeploying, setIsDeploying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleToggle = (key: keyof typeof extensions) => {
    setExtensions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Three-Factor Handshake Keyhole Protocol Mock
  const handleVerifyTarget = () => {
    if (!apiToken) {
      alert("Please provide a Pipedrive environment authentication token to initialize tunnel.");
      return;
    }
    setIsVerifying(true);
    
    setTimeout(() => {
      setIsVerifying(false);
      setTargetCompany("Buckeye Metal Sales");
      setTargetAdmin("John Doe (System Administrator)");
    }, 1000);
  };

  // Compile Deploy Execution Track
  const handleDeploy = () => {
    if (!targetCompany) return;
    setIsDeploying(true);
    setLogs([]);

    const workflowSteps = [
      "Initial validation check parsed successfully.",
      "Established encrypted handshake session with target endpoint routing maps.",
      "Mapping global image architecture layer: Rosewood Core v1.2 Standard...",
      "Programmatically deploying custom data dictionary nodes (14 custom deal objects).",
      "Injecting uniform closed-lost justification keys across dataset metrics.",
      "Evaluating feature configuration criteria adjustments manifest...",
      extensions.highVolume ? "Appending Module: High-Volume Velocity Lead Tracking pipeline layout." : null,
      extensions.outsideSales ? "Appending Module: Outside-Sales Field Mapping Geolocation tracking matrix." : null,
      extensions.smsAlerts ? "Appending Module: Dispatch logic linkage hooks to external Twilio endpoints." : null,
      "Activating background serverless REST API callback listeners.",
      "Compiling configuration operational guides inside internal repository storage blocks.",
      "Deployment operation complete. Targeted client infrastructure is fully live."
    ].filter(Boolean) as string[];

    workflowSteps.forEach((step, index) => {
      setTimeout(() => {
        setLogs(prev => [...prev, step]);
        if (index === workflowSteps.length - 1) {
          setIsDeploying(false);
        }
      }, (index + 1) * 400);
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 font-sans">Deployment Launchpad</h1>
        <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1.5 font-normal max-w-2xl leading-relaxed">
          Declare runtime connection vectors, attach optional feature extensions, and compile deterministic CRM configurations cleanly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Parameter Assignment Control Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 01: Connection Tunnel Handshake */}
          <div className="bg-white border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl shadow-sm p-6 space-y-5 transition-all">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-600 dark:text-zinc-400 tracking-wider">01 / Connection Tunnel</span>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-zinc-300">Pipedrive Account REST API Token</label>
              <div className="flex space-x-3">
                <input 
                  type="password" 
                  placeholder="Paste environment authentication key string..."
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  disabled={!!targetCompany}
                  className="flex-1 bg-slate-50/50 border border-slate-200 dark:bg-zinc-800/40 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm font-mono text-slate-800 dark:text-zinc-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-500 transition-all disabled:opacity-40"
                />
                {!targetCompany ? (
                  <button 
                    onClick={handleVerifyTarget}
                    disabled={isVerifying}
                    className="bg-slate-800 hover:bg-slate-700 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-medium px-5 py-2.5 rounded-lg text-sm shadow-sm transition-all disabled:opacity-40"
                  >
                    {isVerifying ? "Verifying..." : "Connect Target"}
                  </button>
                ) : (
                  <button 
                    onClick={() => { setTargetCompany(null); setTargetAdmin(null); setApiToken(""); setLogs([]); }}
                    className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* Verification Target Display Notification Block */}
            {targetCompany && (
              <div className="p-4 bg-slate-50 border border-slate-200 dark:bg-zinc-800/50 dark:border-zinc-700 rounded-xl flex justify-between items-center transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-slate-500 dark:bg-slate-400 animate-pulse" />
                  <div>
                    <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Target Verified</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">{targetCompany}</div>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-700 dark:text-zinc-300 bg-slate-200/50 dark:bg-zinc-800 px-3 py-1.5 border border-slate-200 dark:border-zinc-700 rounded-lg font-mono font-medium">
                  Verified via: <span className="font-semibold text-slate-900 dark:text-zinc-100">{targetAdmin}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 02: Architecture Configuration Selection */}
          <div className="bg-white border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl shadow-sm p-6 space-y-6 transition-all">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-600 dark:text-zinc-400 tracking-wider">02 / Configuration Manifest</span>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-zinc-300">Universal Core Blueprint Model Base</label>
              <select 
                value={selectedBlueprint}
                onChange={(e) => setSelectedBlueprint(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 dark:bg-zinc-800/40 dark:border-zinc-700 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-500 transition-all"
              >
                <option value="rosewood_core_v1.2">Rosewood Standard Architecture Core v1.2</option>
                <option value="rosewood_core_v1.3_beta">Rosewood Standard Architecture Core v1.3 (Beta Evaluation Track)</option>
              </select>
            </div>

            {/* Multi-Select Feature Matrix Layout Block */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-zinc-300">Declarative Modular Upgrades</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Module Item Card 1 */}
                <div 
                  onClick={() => handleToggle("highVolume")}
                  className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all duration-150 ${extensions.highVolume ? 'border-slate-700 dark:border-zinc-400 bg-slate-50/60 dark:bg-zinc-800/40 shadow-sm' : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700'}`}
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-800 dark:text-zinc-200">High-Volume Distribution</div>
                    <div className="text-xs text-slate-400 dark:text-zinc-500 font-normal">Appends rapid inbound pipelines and automation recipes</div>
                  </div>
                  <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${extensions.highVolume ? 'bg-slate-800 border-slate-800 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-950' : 'border-slate-300 dark:border-zinc-700'}`}>
                    {extensions.highVolume && <span className="text-xs font-bold">✓</span>}
                  </div>
                </div>

                {/* Module Item Card 2 */}
                <div 
                  onClick={() => handleToggle("outsideSales")}
                  className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all duration-150 ${extensions.outsideSales ? 'border-slate-700 dark:border-zinc-400 bg-slate-50/60 dark:bg-zinc-800/40 shadow-sm' : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700'}`}
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Outside-Sales Logistics</div>
                    <div className="text-xs text-slate-400 dark:text-zinc-500 font-normal">Appends field mapping tools and geographic follow-up loops</div>
                  </div>
                  <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${extensions.outsideSales ? 'bg-slate-800 border-slate-800 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-950' : 'border-slate-300 dark:border-zinc-700'}`}>
                    {extensions.outsideSales && <span className="text-xs font-bold">✓</span>}
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Right Section: Continuous Integration Deployment Feed Console */}
        <div className="bg-white border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl shadow-sm p-6 flex flex-col justify-between space-y-6 h-full min-h-[440px] transition-all">
          <div className="space-y-4 flex-1 flex flex-col">
            <span className="text-xs font-mono font-bold uppercase text-slate-600 dark:text-zinc-400 tracking-wider">03 / Compilation Monitor</span>
            
            {/* Clean Professional Execution Stream */}
            <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 dark:bg-zinc-950 dark:border-zinc-800 p-4 overflow-y-auto space-y-3 shadow-inner max-h-[360px]">
              {logs.length === 0 ? (
                <div className="text-slate-400 dark:text-zinc-600 italic text-xs font-sans text-center mt-12 px-4 leading-relaxed">
                  Infrastructure compilation pipeline idle. Establish tunnel handshake sequence to activate tracking array.
                </div>
              ) : (
                <div className="space-y-3 font-sans text-xs">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-start space-x-3 text-slate-600 dark:text-zinc-400 animate-fade-in">
                      <span className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${log.includes("success") || log.includes("live") ? "bg-emerald-500" : "bg-slate-700 dark:bg-zinc-400"}`} />
                      <span className={log.includes("success") || log.includes("live") ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-slate-600 dark:text-zinc-300"}>
                        {step_description(log)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {isDeploying && (
                <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 dark:text-zinc-400 mt-2">
                  <span className="h-1 w-1.5 rounded-full bg-slate-500 dark:bg-zinc-400 animate-ping" />
                  <span className="italic font-normal text-slate-400 dark:text-zinc-500">Processing serverless integration routines...</span>
                </div>
              )}
            </div>
          </div>

          {/* Core Trigger Event Action Button */}
          <button
            onClick={handleDeploy}
            disabled={!targetCompany || isDeploying}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-sans font-semibold py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all duration-100 active:scale-[0.99] disabled:bg-slate-100 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600"
          >
            {isDeploying ? "Compiling Module Stack..." : targetCompany ? "⚡ Run Atomic Deployment" : "Validate Connection Tunnel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline formatting helper to clean strings
function step_description(str: string) {
  return str;
}