// app/page.tsx
"use client";

import { useState, useEffect } from "react";

export default function Launchpad() {
  const [apiToken, setApiToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [targetCompany, setTargetCompany] = useState<string | null>(null);
  const [targetAdmin, setTargetAdmin] = useState<string | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState("rosewood_core_v1.2");
  // Template data for v1.2 and v1.3
  const templateDataV1_2 = {
    id: "rosewood_v1.2",
    name: "Rosewood Standard Setup v1.2",
    version: "1.2",
    pipelines: [
      {
        id: "pip_leads",
        name: "Lead Management",
        order_nr: 1,
        stages: [
          { id: "stg_new", name: "New Leads", order_nr: 1, deal_probability: 0, rotten_flag: false, rotten_days: null },
          { id: "stg_qualified", name: "Qualified", order_nr: 2, deal_probability: 30, rotten_flag: true, rotten_days: 7 },
          { id: "stg_contacted", name: "Contacted", order_nr: 3, deal_probability: 50, rotten_flag: true, rotten_days: 14 }
        ]
      },
      {
        id: "pip_sales",
        name: "Sales Pipeline",
        order_nr: 2,
        stages: [
          { id: "stg_proposal", name: "Proposal Sent", order_nr: 1, deal_probability: 50, rotten_flag: true, rotten_days: 21 },
          { id: "stg_negotiation", name: "Negotiation", order_nr: 2, deal_probability: 75, rotten_flag: true, rotten_days: 30 },
          { id: "stg_closed", name: "Closed Won", order_nr: 3, deal_probability: 100, rotten_flag: false, rotten_days: null }
        ]
      }
    ]
  };

  const templateDataV1_3 = {
    id: "rosewood_v1.3",
    name: "Rosewood Standard Setup v1.3",
    version: "1.3",
    pipelines: [
      {
        id: "pip_leads_v3",
        name: "Lead Management v3",
        order_nr: 1,
        stages: [
          { id: "stg_new_v3", name: "New Leads", order_nr: 1, deal_probability: 0, rotten_flag: false, rotten_days: null },
          { id: "stg_screened", name: "Screened", order_nr: 2, deal_probability: 20, rotten_flag: true, rotten_days: 5 },
          { id: "stg_qualified_v3", name: "Qualified", order_nr: 3, deal_probability: 40, rotten_flag: true, rotten_days: 10 },
          { id: "stg_contacted_v3", name: "Contacted", order_nr: 4, deal_probability: 60, rotten_flag: true, rotten_days: 15 }
        ]
      },
      {
        id: "pip_sales_v3",
        name: "Sales Pipeline v3",
        order_nr: 2,
        stages: [
          { id: "stg_quote", name: "Quote Sent", order_nr: 1, deal_probability: 45, rotten_flag: true, rotten_days: 14 },
          { id: "stg_proposal_v3", name: "Proposal", order_nr: 2, deal_probability: 60, rotten_flag: true, rotten_days: 21 },
          { id: "stg_negotiation_v3", name: "Negotiation", order_nr: 3, deal_probability: 80, rotten_flag: true, rotten_days: 30 },
          { id: "stg_closed_v3", name: "Closed Won", order_nr: 4, deal_probability: 100, rotten_flag: false, rotten_days: null }
        ]
      }
    ]
  };

  const [blueprintOptions, setBlueprintOptions] = useState([
    { value: "rosewood_core_v1.2", label: "Rosewood Standard Setup v1.2" },
    { value: "rosewood_core_v1.3_beta", label: "Rosewood Standard Setup v1.3" }
  ]);
  const [selectedBlueprintObj, setSelectedBlueprintObj] = useState<any>(null);
  
  const [extensions, setExtensions] = useState({
    highVolume: true,
    outsideSales: false,
    smsAlerts: false,
    retentionCare: false,
  });

  const [isDeploying, setIsDeploying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Load saved connection parameters and custom template from localStorage on mount
  useEffect(() => {
    // Restore connection state
    const savedToken = localStorage.getItem("rosewood_api_token");
    const savedCompany = localStorage.getItem("rosewood_target_company");
    const savedAdmin = localStorage.getItem("rosewood_target_admin");
    const savedLogs = localStorage.getItem("rosewood_launchpad_logs");

    if (savedToken) setApiToken(savedToken);
    if (savedCompany) setTargetCompany(savedCompany);
    if (savedAdmin) setTargetAdmin(savedAdmin);
    if (savedLogs) setLogs(JSON.parse(savedLogs));

    // Load custom template if it exists
    const customTemplate = localStorage.getItem("rosewood_discovered_blueprint");
    if (customTemplate) {
      try {
        const parsed = JSON.parse(customTemplate);
        const customOption = {
          value: "my_edited_template",
          label: "My Edited Template"
        };
        setBlueprintOptions(prev => [customOption, ...prev]);
        setSelectedBlueprint("my_edited_template");
        setSelectedBlueprintObj(parsed);
      } catch (e) {
        console.error("Failed to parse custom template from storage", e);
      }
    }
  }, []);

  const handleToggle = (key: keyof typeof extensions) => {
    setExtensions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBlueprintSelect = (value: string) => {
    setSelectedBlueprint(value);
    if (value === "my_edited_template") {
      const customTemplate = localStorage.getItem("rosewood_discovered_blueprint");
      if (customTemplate) {
        try {
          setSelectedBlueprintObj(JSON.parse(customTemplate));
        } catch (e) {
          console.error("Failed to parse custom template", e);
        }
      }
    } else if (value === "rosewood_core_v1.2") {
      setSelectedBlueprintObj(templateDataV1_2);
    } else if (value === "rosewood_core_v1.3_beta") {
      setSelectedBlueprintObj(templateDataV1_3);
    } else {
      setSelectedBlueprintObj(null);
    }
  };

  // Connect to live account and save connection state
  const handleVerifyTarget = async () => {
    if (!apiToken) {
      alert("Please provide a Pipedrive API token to connect.");
      return;
    }
    setIsVerifying(true);
    setLogs([]);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: apiToken }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(`Connection failed: ${result.error}`);
        setIsVerifying(false);
        return;
      }

      // Save template and connection state to localStorage
      localStorage.setItem("rosewood_discovered_blueprint", JSON.stringify(result.blueprint));
      localStorage.setItem("rosewood_api_token", apiToken);
      const companyName = "Rosewood Active Environment";
      const adminStatus = `Discovered: ${result.blueprint.pipelines.length} Active Pipelines`;
      localStorage.setItem("rosewood_target_company", companyName);
      localStorage.setItem("rosewood_target_admin", adminStatus);

      setIsVerifying(false);
      setTargetCompany(companyName);
      setTargetAdmin(adminStatus);
      
      const newLogs = [
        "✓ Connected to your live account successfully.",
        "→ Analyzing your existing pipelines and stages...",
        ...result.blueprint.pipelines.map((p: any) => 
          `✓ Found pipeline: ${p.name} with ${p.stages.length} stages`
        ),
        "✓ Your template is ready to customize in the editor."
      ];
      setLogs(newLogs);
      localStorage.setItem("rosewood_launchpad_logs", JSON.stringify(newLogs));

    } catch (err: any) {
      alert(`Connection error: ${err.message}`);
      setIsVerifying(false);
    }
  };

  const handleDeploy = async () => {
    if (!targetCompany || !apiToken) return;
    setIsDeploying(true);
    setLogs([]);

    try {
      const template = selectedBlueprintObj || { pipelines: [] };
      
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: apiToken, template })
      });

      const result = await response.json();

      if (result.success && result.logs) {
        // Stream logs from the deployment response
        result.logs.forEach((log: string, index: number) => {
          setTimeout(() => {
            setLogs(prev => [...prev, log]);
            if (index === result.logs.length - 1) {
              setIsDeploying(false);
            }
          }, (index + 1) * 400);
        });
      } else {
        setLogs([`✗ Deployment failed: ${result.error || 'Unknown error'}`]);
        setIsDeploying(false);
      }
    } catch (err: any) {
      setLogs([`✗ Connection error: ${err.message}`]);
      setIsDeploying(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 font-sans">Deployment Launchpad</h1>
        <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1.5 font-normal max-w-2xl leading-relaxed">
          Declare runtime connection vectors, attach optional feature extensions, and compile deterministic CRM configurations cleanly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 01: Connect Account */}
          <div className="bg-white border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl shadow-sm p-6 space-y-5 transition-all">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-600 dark:text-zinc-400 tracking-wider">01 / Connect Account</span>
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
                    className="bg-slate-800 text-white hover:bg-slate-700 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-medium px-5 py-2.5 rounded-lg text-sm shadow-sm transition-all disabled:opacity-40"
                  >
                    {isVerifying ? "Discovering..." : "Connect Target"}
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setTargetCompany(null);
                      setTargetAdmin(null);
                      setApiToken("");
                      setLogs([]);
                      localStorage.removeItem("rosewood_api_token");
                      localStorage.removeItem("rosewood_target_company");
                      localStorage.removeItem("rosewood_target_admin");
                      localStorage.removeItem("rosewood_launchpad_logs");
                    }}
                    className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

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
                  Status: <span className="font-semibold text-slate-900 dark:text-zinc-100">{targetAdmin}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 02: Choose Template */}
          <div className="bg-white border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl shadow-sm p-6 space-y-6 transition-all">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-600 dark:text-zinc-400 tracking-wider">02 / Template Selection</span>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-zinc-300">Choose Your Setup Template</label>
              <select 
                value={selectedBlueprint}
                onChange={(e) => handleBlueprintSelect(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 dark:bg-zinc-800/40 dark:border-zinc-700 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-500 transition-all"
              >
                {blueprintOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-zinc-300">Optional Extra Pipelines</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Right Section: Activity Log */}
        <div className="bg-white border border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl shadow-sm p-6 flex flex-col justify-between space-y-6 h-full min-h-[440px] transition-all">
          <div className="space-y-4 flex-1 flex flex-col">
            <span className="text-xs font-mono font-bold uppercase text-slate-600 dark:text-zinc-400 tracking-wider">03 / Activity Log</span>
            
            <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 dark:bg-zinc-950 dark:border-zinc-800 p-4 overflow-y-auto space-y-3 shadow-inner max-h-[360px]">
              {logs.length === 0 ? (
                <div className="text-slate-400 dark:text-zinc-600 italic text-xs font-sans text-center mt-12 px-4 leading-relaxed">
                  Infrastructure compilation pipeline idle. Establish tunnel handshake sequence to activate tracking array.
                </div>
              ) : (
                <div className="space-y-3 font-sans text-xs">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-start space-x-3 text-slate-600 dark:text-zinc-400 animate-fade-in">
                      <span className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${log.includes("SUCCESS") || log.includes("PARSED") ? "bg-emerald-500" : "bg-slate-700 dark:bg-zinc-400"}`} />
                      <span className={log.includes("SUCCESS") || log.includes("PARSED") ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-slate-600 dark:text-zinc-300"}>
                        {log}
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