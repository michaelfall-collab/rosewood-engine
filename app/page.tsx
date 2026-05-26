// app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  options?: string[];
}

interface StudioBlueprint {
  id: string;
  name: string;
  version: string;
  pipelines: StudioPipeline[];
  customFields: StudioCustomField[];
  folder?: string;
  description?: string;
  isLive?: boolean;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const LIVE_VIRTUAL_ID = "__live_target__";

const initialTemplatesCatalog: StudioBlueprint[] = [
  {
    id: "rosewood_ops_v1",
    name: "Rosewood Sample Setup",
    version: "1.2.0",
    pipelines: [
      {
        id: "pip_static_1",
        name: "Lead to Waitlist Track",
        stages: [{ id: "stg_s1", name: "Screening Phase", rottenDays: 14 }],
      },
    ],
    customFields: [
      { id: "fld_1", name: "Lead Source Detail", type: "dropdown", scope: "Deals", options: ["Google Ads", "Referral Partner", "Organic"] },
    ],
    folder: "Samples",
  },
  {
    id: "rosewood_v1.2",
    name: "Standard Setup v1.2",
    version: "1.2",
    pipelines: [
      {
        id: "pip_leads_v1.2",
        name: "Lead Management",
        stages: [
          { id: "stg_new_1.2", name: "New Leads", rottenDays: null },
          { id: "stg_qualified_1.2", name: "Qualified", rottenDays: 7 },
          { id: "stg_contacted_1.2", name: "Contacted", rottenDays: 14 },
        ],
      },
      {
        id: "pip_sales_v1.2",
        name: "Sales Pipeline",
        stages: [
          { id: "stg_proposal_1.2", name: "Proposal Sent", rottenDays: 21 },
          { id: "stg_negotiation_1.2", name: "Negotiation", rottenDays: 30 },
          { id: "stg_closed_1.2", name: "Closed Won", rottenDays: null },
        ],
      },
    ],
    customFields: [],
    folder: "Standard Setups",
  },
  {
    id: "rosewood_v1.3",
    name: "Standard Setup v1.3",
    version: "1.3",
    pipelines: [
      {
        id: "pip_leads_v1.3",
        name: "Lead Management v3",
        stages: [
          { id: "stg_new_1.3", name: "New Leads", rottenDays: null },
          { id: "stg_screened_1.3", name: "Screened", rottenDays: 5 },
          { id: "stg_qualified_1.3", name: "Qualified", rottenDays: 10 },
          { id: "stg_contacted_1.3", name: "Contacted", rottenDays: 15 },
        ],
      },
      {
        id: "pip_sales_v1.3",
        name: "Sales Pipeline v3",
        stages: [
          { id: "stg_quote_1.3", name: "Quote Sent", rottenDays: 14 },
          { id: "stg_proposal_1.3", name: "Proposal", rottenDays: 21 },
          { id: "stg_negotiation_1.3", name: "Negotiation", rottenDays: 30 },
          { id: "stg_closed_1.3", name: "Closed Won", rottenDays: null },
        ],
      },
    ],
    customFields: [],
    folder: "Standard Setups",
  },
];

// ─── Folder tree helpers ──────────────────────────────────────────────────────

type FolderNode = {
  path: string;
  label: string;
  children: FolderNode[];
  templates: StudioBlueprint[];
};

function buildFolderTree(catalog: StudioBlueprint[]): { root: StudioBlueprint[]; folders: FolderNode[] } {
  const root: StudioBlueprint[] = [];
  const folderMap: Record<string, FolderNode> = {};

  catalog.forEach((b) => {
    if (!b.folder) {
      root.push(b);
    } else {
      const parts = b.folder.split("/").map((s) => s.trim()).filter(Boolean);
      let currentPath = "";
      parts.forEach((part, i) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!folderMap[currentPath]) {
          folderMap[currentPath] = { path: currentPath, label: part, children: [], templates: [] };
          if (parentPath && folderMap[parentPath]) {
            folderMap[parentPath].children.push(folderMap[currentPath]);
          }
        }
        if (i === parts.length - 1) {
          folderMap[currentPath].templates.push(b);
        }
      });
    }
  });

  // Collect top-level folders only
  const topFolders = Object.values(folderMap).filter((node) => !node.path.includes("/"));

  return { root, folders: topFolders };
}

// ─── PD Green ────────────────────────────────────────────────────────────────
const PD_GREEN = "#257e45";
const PD_GREEN_LIGHT = "#e8f5ee";
const PD_GREEN_DARK = "#1a5c31";

// ─── Component ───────────────────────────────────────────────────────────────

export default function CommandDeck() {
  // Mode
  const [viewMode, setViewMode] = useState<"deploy" | "edit">("deploy");

  // Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [openFolderOptions, setOpenFolderOptions] = useState<Record<string, boolean>>({});
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");
  const [addingSubfolderTo, setAddingSubfolderTo] = useState<string | null>(null);
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [addingTemplateTo, setAddingTemplateTo] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");

  // Connection tunnel
  const [showApiOverlay, setShowApiOverlay] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [apiToken, setApiToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [targetCompany, setTargetCompany] = useState<string | null>(null);
  const [targetAdmin, setTargetAdmin] = useState<string | null>(null);
  const [livePipelines, setLivePipelines] = useState<StudioPipeline[]>([]);

  // Catalog
  const [catalog, setCatalog] = useState<StudioBlueprint[]>(initialTemplatesCatalog);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("rosewood_v1.2");
  const [activePipelineId, setActivePipelineId] = useState("pip_leads_v1.2");
  const [isViewingLive, setIsViewingLive] = useState(false);

  // Title editing
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [titleValue, setTitleValue] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Pipeline reorder
  const [isReorderingPipelines, setIsReorderingPipelines] = useState(false);
  const [renamingPipelineId, setRenamingPipelineId] = useState<string | null>(null);
  const [renamePipelineValue, setRenamePipelineValue] = useState("");

  // Stages
  const [newStageName, setNewStageName] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modals
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const [isLiveSaveAsOpen, setIsLiveSaveAsOpen] = useState(false);
  const [liveSaveAsName, setLiveSaveAsName] = useState("");
  const [liveSaveAsFolder, setLiveSaveAsFolder] = useState("");

  // Save As
  const [saveAsName, setSaveAsName] = useState("");
  const [saveAsFolder, setSaveAsFolder] = useState("");
  const [saveAsNewFolderInput, setSaveAsNewFolderInput] = useState("");
  const [saveAsIsNewFolder, setSaveAsIsNewFolder] = useState(false);
  const [saveAsOverwriteId, setSaveAsOverwriteId] = useState<string | null>(null);

  // Fields
  const [activeFieldsTab, setActiveFieldsTab] = useState("Lead/deal");
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [newFieldOption, setNewFieldOption] = useState("");

  // Deploy
  const [isDeploying, setIsDeploying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [logsExpanded, setLogsExpanded] = useState(false);

  const fieldTabs = ["Lead/deal", "Person", "Organization", "Product", "Project"];

  // ─── Hydration ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const savedToken = localStorage.getItem("rosewood_api_token");
    const savedCompany = localStorage.getItem("rosewood_target_company");
    const savedAdmin = localStorage.getItem("rosewood_target_admin");
    const savedLogs = localStorage.getItem("rosewood_launchpad_logs");
    const savedLive = localStorage.getItem("rosewood_live_pipelines");

    if (savedToken) setApiToken(savedToken);
    if (savedCompany) setTargetCompany(savedCompany);
    if (savedAdmin) setTargetAdmin(savedAdmin);
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    if (savedLive) setLivePipelines(JSON.parse(savedLive));

    const savedCatalog = localStorage.getItem("rosewood_studio_catalog");
    if (savedCatalog) {
      try {
        const parsed = JSON.parse(savedCatalog) as StudioBlueprint[];
        if (parsed && parsed.length > 0) {
          setCatalog(parsed);
          const savedActive = localStorage.getItem("rosewood_discovered_blueprint");
          if (savedActive) {
            const pa = JSON.parse(savedActive);
            if (parsed.some((b) => b.id === pa.id)) {
              setSelectedBlueprintId(pa.id);
              if (pa.pipelines?.length > 0) setActivePipelineId(pa.pipelines[0].id);
            } else {
              setSelectedBlueprintId(parsed[0].id);
              if (parsed[0].pipelines?.length > 0) setActivePipelineId(parsed[0].pipelines[0].id);
            }
          }
        }
      } catch (e) {
        console.error("Catalog parse error", e);
      }
    } else {
      localStorage.setItem("rosewood_studio_catalog", JSON.stringify(initialTemplatesCatalog));
      localStorage.setItem("rosewood_discovered_blueprint", JSON.stringify(initialTemplatesCatalog[1]));
    }
  }, []);

  // Derived
  const currentBlueprint: StudioBlueprint = isViewingLive
    ? {
        id: LIVE_VIRTUAL_ID,
        name: targetCompany || "Live Target Account Setup",
        version: "live",
        pipelines: livePipelines,
        customFields: [],
        isLive: true,
      }
    : catalog.find((b) => b.id === selectedBlueprintId) || catalog[0] || initialTemplatesCatalog[1];

  const currentPipeline =
    currentBlueprint?.pipelines.find((p) => p.id === activePipelineId) ||
    currentBlueprint?.pipelines[0];

  // Auto-sync
  useEffect(() => {
    if (currentBlueprint && !currentBlueprint.isLive) {
      localStorage.setItem("rosewood_discovered_blueprint", JSON.stringify(currentBlueprint));
    }
  }, [selectedBlueprintId, catalog, currentBlueprint]);

  // Sync title when blueprint changes
  useEffect(() => {
    setTitleValue(currentBlueprint?.name || "");
  }, [selectedBlueprintId, isViewingLive]);

  // Close popover on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowApiOverlay(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ─── Catalog helpers ─────────────────────────────────────────────────────────

  const saveCatalog = (next: StudioBlueprint[]) => {
    setCatalog(next);
    localStorage.setItem("rosewood_studio_catalog", JSON.stringify(next));
  };

  const switchBlueprint = (id: string) => {
    setIsViewingLive(false);
    setSelectedBlueprintId(id);
    const t = catalog.find((b) => b.id === id);
    if (t?.pipelines.length) setActivePipelineId(t.pipelines[0].id);
    setIsReorderingPipelines(false);
    setRenamingPipelineId(null);
  };

  // ─── Title autosave ──────────────────────────────────────────────────────────

  const handleTitleSave = () => {
    if (!titleValue.trim() || currentBlueprint.isLive) return;
    saveCatalog(
      catalog.map((b) =>
        b.id === selectedBlueprintId ? { ...b, name: titleValue.trim() } : b
      )
    );
    setIsEditingTitle(false);
  };

  // ─── Connection ──────────────────────────────────────────────────────────────

  const handleVerifyTarget = async () => {
    if (!apiToken) return;
    setIsVerifying(true);
    setLogs([]);
    setLogsExpanded(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: apiToken }),
      });
      const result = await res.json();
      if (!result.success) {
        alert(`Verification rejected: ${result.error}`);
        setIsVerifying(false);
        return;
      }
      const ingested = result.blueprint;
      const normalizedPipelines: StudioPipeline[] = (ingested.pipelines || []).map((pipe: any) => ({
        ...pipe,
        stages: (pipe.stages || []).map((stage: any) => {
          const days = stage.rottenDays !== undefined ? stage.rottenDays : stage.rotten_days;
          return { ...stage, rottenDays: days !== undefined ? days : null };
        }),
      }));

      const company = "Rosewood Active Environment";
      const admin = `Verified: ${normalizedPipelines.length} Active Channels`;

      localStorage.setItem("rosewood_api_token", apiToken);
      localStorage.setItem("rosewood_target_company", company);
      localStorage.setItem("rosewood_target_admin", admin);
      localStorage.setItem("rosewood_live_pipelines", JSON.stringify(normalizedPipelines));

      setTargetCompany(company);
      setTargetAdmin(admin);
      setLivePipelines(normalizedPipelines);

      const verLogs = [
        "✓ Connection handshake established.",
        ...normalizedPipelines.map((p) => `✓ Discovered: "${p.name}" — ${p.stages.length} stages`),
        "✓ Live Account Setup ready to inspect.",
      ];
      setLogs(verLogs);
      localStorage.setItem("rosewood_launchpad_logs", JSON.stringify(verLogs));
      setIsVerifying(false);
      setShowApiOverlay(false);
    } catch (err: any) {
      alert(`Handshake failure: ${err.message}`);
      setIsVerifying(false);
    }
  };

  const handleDisconnect = () => {
    setTargetCompany(null);
    setTargetAdmin(null);
    setApiToken("");
    setLogs([]);
    setLivePipelines([]);
    setIsViewingLive(false);
    ["rosewood_api_token", "rosewood_target_company", "rosewood_target_admin", "rosewood_launchpad_logs", "rosewood_live_pipelines"].forEach(
      (k) => localStorage.removeItem(k)
    );
    setShowApiOverlay(false);
  };

  // ─── Deploy ──────────────────────────────────────────────────────────────────

  const handleDeploy = async () => {
    if (!targetCompany || !apiToken) return;
    setIsDeploying(true);
    setLogs([]);
    setLogsExpanded(true);
    try {
      const activeObj = currentBlueprint;
      const formattedPipelines = activeObj.pipelines.map((pipe, pIdx) => ({
        name: pipe.name,
        order_nr: pIdx + 1,
        stages: pipe.stages.map((stage, sIdx) => {
          const rottenFlag = stage.rottenDays !== null && stage.rottenDays !== undefined && stage.rottenDays > 0;
          return {
            name: stage.name,
            order_nr: sIdx + 1,
            deal_probability: 100,
            rotten_flag: rottenFlag,
            rotten_days: stage.rottenDays,
          };
        }),
      }));
      const payload = {
        id: activeObj.id,
        name: activeObj.name,
        version: activeObj.version || "1.0.0",
        description: activeObj.description || "Deployable setup config",
        pipelines: formattedPipelines,
        customFields: activeObj.customFields || [],
      };
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: apiToken, template: payload }),
      });
      const result = await res.json();
      if (result.success && result.logs) {
        result.logs.forEach((log: string, i: number) => {
          setTimeout(() => {
            setLogs((prev) => [...prev, log]);
            if (i === result.logs.length - 1) setIsDeploying(false);
          }, (i + 1) * 350);
        });
      } else {
        setLogs([`✗ Deployment failure: ${result.error || "Unknown error"}`]);
        setIsDeploying(false);
      }
    } catch (err: any) {
      setLogs([`✗ Network failure: ${err.message}`]);
      setIsDeploying(false);
    }
  };

  // ─── Export / Import ─────────────────────────────────────────────────────────

  const handleExportSetupImage = () => {
    if (!currentBlueprint) return;
    const blob = new Blob([JSON.stringify(currentBlueprint, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rosewood-setup-${currentBlueprint.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportSetupImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.id || !parsed.name || !parsed.pipelines) {
          alert("Invalid backup JSON.");
          return;
        }
        const norm: StudioBlueprint = {
          ...parsed,
          pipelines: parsed.pipelines.map((pipe: any) => ({
            ...pipe,
            stages: pipe.stages.map((s: any) => ({
              ...s,
              rottenDays: s.rottenDays !== undefined ? s.rottenDays : s.rotten_days ?? null,
            })),
          })),
          customFields: parsed.customFields || [],
        };
        const next = [...catalog];
        const idx = next.findIndex((b) => b.id === norm.id);
        if (idx >= 0) next[idx] = norm;
        else next.push(norm);
        saveCatalog(next);
        switchBlueprint(norm.id);
      } catch (err: any) {
        alert(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ─── Live Save As ────────────────────────────────────────────────────────────

  const openLiveSaveAs = () => {
    setLiveSaveAsName(targetCompany ? `${targetCompany} Snapshot` : "Live Account Snapshot");
    setLiveSaveAsFolder("");
    setIsLiveSaveAsOpen(true);
  };

  const handleLiveSaveAsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveSaveAsName.trim()) return;
    const freshId = "live_snap_" + Date.now();
    const snap: StudioBlueprint = {
      id: freshId,
      name: liveSaveAsName.trim(),
      version: new Date().toISOString().slice(0, 10),
      pipelines: livePipelines,
      customFields: [],
      folder: liveSaveAsFolder.trim() || undefined,
    };
    const next = [...catalog, snap];
    saveCatalog(next);
    setIsLiveSaveAsOpen(false);
    switchBlueprint(freshId);
    setViewMode("edit");
  };

  // ─── Stage mutators ──────────────────────────────────────────────────────────

  const handleUpdateStageName = (stageId: string, name: string) => {
    saveCatalog(
      catalog.map((b) =>
        b.id !== selectedBlueprintId
          ? b
          : { ...b, pipelines: b.pipelines.map((p) => ({ ...p, stages: p.stages.map((s) => (s.id === stageId ? { ...s, name } : s)) })) }
      )
    );
  };

  const handleUpdateRottenDays = (stageId: string, days: number | null) => {
    saveCatalog(
      catalog.map((b) =>
        b.id !== selectedBlueprintId
          ? b
          : { ...b, pipelines: b.pipelines.map((p) => ({ ...p, stages: p.stages.map((s) => (s.id === stageId ? { ...s, rottenDays: days } : s)) })) }
      )
    );
  };

  const handleAddStage = (name: string) => {
    if (!name.trim() || !currentPipeline) return;
    const freshStage: StudioStage = { id: "stg_" + Date.now(), name: name.trim(), rottenDays: null };
    saveCatalog(
      catalog.map((b) =>
        b.id !== selectedBlueprintId
          ? b
          : {
              ...b,
              pipelines: b.pipelines.map((p) =>
                p.id !== activePipelineId ? p : { ...p, stages: [...p.stages, freshStage] }
              ),
            }
      )
    );
    setNewStageName("");
  };

  const handleDuplicateStage = (stageId: string) => {
    if (!currentPipeline) return;
    const idx = currentPipeline.stages.findIndex((s) => s.id === stageId);
    if (idx < 0) return;
    const src = currentPipeline.stages[idx];
    const cloned: StudioStage = { id: "stg_" + Date.now(), name: `${src.name} (Copy)`, rottenDays: src.rottenDays };
    const next = [...currentPipeline.stages];
    next.splice(idx + 1, 0, cloned);
    saveCatalog(
      catalog.map((b) =>
        b.id !== selectedBlueprintId
          ? b
          : { ...b, pipelines: b.pipelines.map((p) => (p.id !== activePipelineId ? p : { ...p, stages: next })) }
      )
    );
  };

  const handleDeleteStage = (stageId: string) => {
    if (!currentPipeline || currentPipeline.stages.length <= 1) {
      alert("A pipeline requires at least one stage.");
      return;
    }
    const remaining = currentPipeline.stages.filter((s) => s.id !== stageId);
    saveCatalog(
      catalog.map((b) =>
        b.id !== selectedBlueprintId
          ? b
          : { ...b, pipelines: b.pipelines.map((p) => (p.id !== activePipelineId ? p : { ...p, stages: remaining })) }
      )
    );
  };

  // ─── Pipeline mutators ───────────────────────────────────────────────────────

  const handleAddPipeline = (name: string) => {
    if (!name.trim()) return;
    const id = "pip_" + Date.now();
    const fresh: StudioPipeline = {
      id,
      name: name.trim(),
      stages: [{ id: "stg_" + Date.now(), name: "Entry Stage", rottenDays: null }],
    };
    saveCatalog(
      catalog.map((b) =>
        b.id !== selectedBlueprintId ? b : { ...b, pipelines: [...b.pipelines, fresh] }
      )
    );
    setActivePipelineId(id);
  };

  const handleDeletePipeline = (pipeId: string) => {
    if (currentBlueprint.pipelines.length <= 1) {
      alert("A template requires at least one pipeline.");
      return;
    }
    if (confirm("Delete this entire pipeline and all its stages?")) {
      const remaining = currentBlueprint.pipelines.filter((p) => p.id !== pipeId);
      saveCatalog(catalog.map((b) => (b.id !== selectedBlueprintId ? b : { ...b, pipelines: remaining })));
      setActivePipelineId(remaining[0].id);
    }
  };

  const handleRenamePipeline = (pipeId: string, name: string) => {
    saveCatalog(
      catalog.map((b) =>
        b.id !== selectedBlueprintId
          ? b
          : { ...b, pipelines: b.pipelines.map((p) => (p.id !== pipeId ? p : { ...p, name })) }
      )
    );
    setRenamingPipelineId(null);
    setRenamePipelineValue("");
  };

  const handleShiftPipeline = (pipeId: string, dir: "left" | "right") => {
    const pipes = [...currentBlueprint.pipelines];
    const idx = pipes.findIndex((p) => p.id === pipeId);
    if (dir === "left" && idx > 0) {
      [pipes[idx - 1], pipes[idx]] = [pipes[idx], pipes[idx - 1]];
    } else if (dir === "right" && idx < pipes.length - 1) {
      [pipes[idx], pipes[idx + 1]] = [pipes[idx + 1], pipes[idx]];
    }
    saveCatalog(catalog.map((b) => (b.id !== selectedBlueprintId ? b : { ...b, pipelines: pipes })));
  };

  // ─── Custom fields ───────────────────────────────────────────────────────────

  const getCategoryName = (scope: string) => {
    const s = (scope || "").toLowerCase();
    if (["deals", "deal", "leads", "lead"].includes(s)) return "Deals";
    if (["people", "person", "contacts"].includes(s)) return "Person";
    if (["organizations", "organization", "org"].includes(s)) return "Organizations";
    if (["products", "product"].includes(s)) return "Products";
    if (["projects", "project"].includes(s)) return "Projects";
    return "Deals";
  };

  const getFieldsForTab = (tab: string) =>
    (currentBlueprint?.customFields || []).filter((f) => {
      const sc = getCategoryName(f.scope);
      if (tab === "Lead/deal") return sc === "Deals";
      if (tab === "Person") return sc === "Person";
      if (tab === "Organization") return sc === "Organizations";
      if (tab === "Product") return sc === "Products";
      if (tab === "Project") return sc === "Projects";
      return false;
    });

  const handleAddCustomField = (name: string, type: string) => {
    if (!name.trim()) return;
    const scopeMap: Record<string, string> = {
      "Lead/deal": "Deals",
      Person: "Person",
      Organization: "Organizations",
      Product: "Products",
      Project: "Projects",
    };
    const fresh: StudioCustomField = {
      id: "fld_" + Date.now(),
      name: name.trim(),
      type,
      scope: scopeMap[activeFieldsTab] || "Deals",
      options: type === "dropdown" ? [] : undefined,
    };
    saveCatalog(
      catalog.map((b) =>
        b.id !== selectedBlueprintId ? b : { ...b, customFields: [...b.customFields, fresh] }
      )
    );
    setNewFieldName("");
  };

  const handleDeleteCustomField = (id: string) => {
    saveCatalog(
      catalog.map((b) =>
        b.id !== selectedBlueprintId
          ? b
          : { ...b, customFields: b.customFields.filter((f) => f.id !== id) }
      )
    );
    setEditingFieldId(null);
  };

  const handleAddOptionToField = (fieldId: string) => {
    if (!newFieldOption.trim()) return;
    saveCatalog(
      catalog.map((b) =>
        b.id !== selectedBlueprintId
          ? b
          : {
              ...b,
              customFields: b.customFields.map((f) =>
                f.id !== fieldId ? f : { ...f, options: [...(f.options || []), newFieldOption.trim()] }
              ),
            }
      )
    );
    setNewFieldOption("");
  };

  const handleRemoveOptionFromField = (fieldId: string, val: string) => {
    saveCatalog(
      catalog.map((b) =>
        b.id !== selectedBlueprintId
          ? b
          : {
              ...b,
              customFields: b.customFields.map((f) =>
                f.id !== fieldId ? f : { ...f, options: (f.options || []).filter((o) => o !== val) }
              ),
            }
      )
    );
  };

  // ─── Save As ─────────────────────────────────────────────────────────────────

  const openSaveAsModal = () => {
    setSaveAsName(`${currentBlueprint.name} (Copy)`);
    setSaveAsFolder(currentBlueprint.folder || "");
    setSaveAsNewFolderInput("");
    setSaveAsIsNewFolder(false);
    setSaveAsOverwriteId(null);
    setIsSaveAsOpen(true);
  };

  useEffect(() => {
    const targetFolder = saveAsIsNewFolder ? saveAsNewFolderInput.trim() : saveAsFolder.trim();
    const matched = catalog.find(
      (b) =>
        b.name.toLowerCase() === saveAsName.toLowerCase().trim() &&
        (b.folder || "").toLowerCase() === (targetFolder || "").toLowerCase()
    );
    setSaveAsOverwriteId(matched ? matched.id : null);
  }, [saveAsName, saveAsFolder, saveAsIsNewFolder, saveAsNewFolderInput, catalog]);

  const handleSaveAsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveAsName.trim()) return;
    const targetFolder = saveAsIsNewFolder ? saveAsNewFolderInput.trim() : saveAsFolder.trim();
    let finalCatalog = [...catalog];
    let finalId = "";
    if (saveAsOverwriteId) {
      finalCatalog = catalog.map((b) =>
        b.id === saveAsOverwriteId
          ? { ...currentBlueprint, id: b.id, name: saveAsName.trim(), folder: targetFolder || undefined }
          : b
      );
      finalId = saveAsOverwriteId;
    } else {
      const freshId = "template_" + Date.now();
      finalCatalog.push({
        ...currentBlueprint,
        id: freshId,
        name: saveAsName.trim(),
        folder: targetFolder || undefined,
        isLive: false,
      });
      finalId = freshId;
    }
    saveCatalog(finalCatalog);
    switchBlueprint(finalId);
    setIsSaveAsOpen(false);
  };

  // ─── Folder ops ──────────────────────────────────────────────────────────────

  const handleRenameFolder = (oldPath: string, newLabel: string) => {
    if (!newLabel.trim()) return;
    const parts = oldPath.split("/");
    parts[parts.length - 1] = newLabel.trim();
    const newPath = parts.join("/");
    const next = catalog.map((b) => {
      if (!b.folder) return b;
      if (b.folder === oldPath || b.folder.startsWith(oldPath + "/")) {
        return { ...b, folder: b.folder.replace(oldPath, newPath) };
      }
      return b;
    });
    saveCatalog(next);
    setRenamingFolder(null);
    setRenameFolderValue("");
  };

  const handleDeleteFolder = (path: string) => {
    if (!confirm(`Delete folder "${path}" and all templates inside it?`)) return;
    const next = catalog.filter((b) => !b.folder || (b.folder !== path && !b.folder.startsWith(path + "/")));
    saveCatalog(next);
    if (!next.some((b) => b.id === selectedBlueprintId)) {
      if (next.length) switchBlueprint(next[0].id);
    }
  };

  const handleCreateSubfolder = (parentPath: string, name: string) => {
    if (!name.trim()) return;
    const newPath = parentPath ? `${parentPath}/${name.trim()}` : name.trim();
    // Create a placeholder template so the folder shows up
    const placeholder: StudioBlueprint = {
      id: "template_" + Date.now(),
      name: "New Setup",
      version: "1.0.0",
      pipelines: [{ id: "pip_" + Date.now(), name: "Pipeline 1", stages: [{ id: "stg_" + Date.now(), name: "Entry", rottenDays: null }] }],
      customFields: [],
      folder: newPath,
    };
    saveCatalog([...catalog, placeholder]);
    setAddingSubfolderTo(null);
    setNewSubfolderName("");
    switchBlueprint(placeholder.id);
    setExpandedFolders((prev) => ({ ...prev, [newPath]: true, [parentPath]: true }));
  };

  const handleCreateTemplateInFolder = (folderPath: string | null, name: string) => {
    if (!name.trim()) return;
    const fresh: StudioBlueprint = {
      id: "template_" + Date.now(),
      name: name.trim(),
      version: "1.0.0",
      pipelines: [{ id: "pip_" + Date.now(), name: "Pipeline 1", stages: [{ id: "stg_" + Date.now(), name: "Entry", rottenDays: null }] }],
      customFields: [],
      folder: folderPath || undefined,
    };
    saveCatalog([...catalog, fresh]);
    setAddingTemplateTo(null);
    setNewTemplateName("");
    switchBlueprint(fresh.id);
    setViewMode("edit");
  };

  // ─── Direct save ─────────────────────────────────────────────────────────────

  const handleDirectSave = () => {
    saveCatalog(catalog);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // ─── Folder tree rendering ───────────────────────────────────────────────────

  const { root: rootTemplates, folders: folderTree } = buildFolderTree(catalog);

  const renderFolderNode = (node: FolderNode, depth = 0): React.ReactNode => {
    const isOpen = !!expandedFolders[node.path];
    const hasOptions = !!openFolderOptions[node.path];

    return (
      <div key={node.path}>
        <div
          className="flex items-center group"
          style={{ paddingLeft: depth * 12 + 8 }}
        >
          {/* Expand arrow */}
          <button
            onClick={() => setExpandedFolders((p) => ({ ...p, [node.path]: !isOpen }))}
            className="w-4 h-4 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 flex items-center justify-center shrink-0 text-[10px] cursor-pointer"
          >
            {isOpen ? "▾" : "▸"}
          </button>

          {/* Folder label — click selects */}
          <button
            onClick={() => setExpandedFolders((p) => ({ ...p, [node.path]: !isOpen }))}
            className="flex-1 text-left px-1.5 py-1 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 truncate cursor-pointer"
          >
            {renamingFolder === node.path ? (
              <input
                autoFocus
                value={renameFolderValue}
                onChange={(e) => setRenameFolderValue(e.target.value)}
                onBlur={() => handleRenameFolder(node.path, renameFolderValue)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameFolder(node.path, renameFolderValue);
                  if (e.key === "Escape") setRenamingFolder(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-600 rounded px-1 py-0.5 text-xs w-full focus:outline-none"
              />
            ) : (
              node.label
            )}
          </button>

          {/* Options toggle: + / × */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenFolderOptions((p) => ({ ...p, [node.path]: !hasOptions }));
            }}
            className={`w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer shrink-0 transition-transform duration-150 ${hasOptions ? "rotate-45" : ""}`}
            title={hasOptions ? "Close options" : "Folder options"}
          >
            <svg viewBox="0 0 12 12" className="w-3 h-3 fill-current"><path d="M5 0h2v5h5v2H7v5H5V7H0V5h5z"/></svg>
          </button>
        </div>

        {/* Options panel — text only, no emojis */}
        {hasOptions && (
          <div
            className="text-xs font-medium space-y-0.5 bg-slate-50 dark:bg-zinc-900/60 border-l-2 border-slate-200 dark:border-zinc-700 ml-4 py-1"
            style={{ paddingLeft: depth * 12 + 20 }}
          >
            <button
              onClick={() => {
                setRenameFolderValue(node.label);
                setRenamingFolder(node.path);
                setOpenFolderOptions((p) => ({ ...p, [node.path]: false }));
              }}
              className="block w-full text-left px-3 py-1 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Rename Folder
            </button>
            <button
              onClick={() => {
                setAddingSubfolderTo(node.path);
                setNewSubfolderName("");
                setOpenFolderOptions((p) => ({ ...p, [node.path]: false }));
              }}
              className="block w-full text-left px-3 py-1 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              New Subfolder
            </button>
            <button
              onClick={() => {
                setAddingTemplateTo(node.path);
                setNewTemplateName("");
                setOpenFolderOptions((p) => ({ ...p, [node.path]: false }));
              }}
              className="block w-full text-left px-3 py-1 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              New Template Here
            </button>
            <button
              onClick={() => {
                handleDeleteFolder(node.path);
                setOpenFolderOptions((p) => ({ ...p, [node.path]: false }));
              }}
              className="block w-full text-left px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
            >
              Delete Folder
            </button>
          </div>
        )}

        {/* Add subfolder inline input */}
        {addingSubfolderTo === node.path && (
          <div className="flex items-center gap-1 ml-6 mt-1 mb-1" style={{ paddingLeft: depth * 12 }}>
            <input
              autoFocus
              value={newSubfolderName}
              onChange={(e) => setNewSubfolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateSubfolder(node.path, newSubfolderName);
                if (e.key === "Escape") setAddingSubfolderTo(null);
              }}
              placeholder="Subfolder name..."
              className="flex-1 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-600 rounded px-2 py-1 text-xs focus:outline-none"
            />
            <button
              onClick={() => handleCreateSubfolder(node.path, newSubfolderName)}
              className="text-[10px] font-bold px-2 py-1 bg-slate-800 text-white rounded cursor-pointer"
            >
              Add
            </button>
          </div>
        )}

        {/* Add template inline input */}
        {addingTemplateTo === node.path && (
          <div className="flex items-center gap-1 ml-6 mt-1 mb-1" style={{ paddingLeft: depth * 12 }}>
            <input
              autoFocus
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTemplateInFolder(node.path, newTemplateName);
                if (e.key === "Escape") setAddingTemplateTo(null);
              }}
              placeholder="Template name..."
              className="flex-1 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-600 rounded px-2 py-1 text-xs focus:outline-none"
            />
            <button
              onClick={() => handleCreateTemplateInFolder(node.path, newTemplateName)}
              className="text-[10px] font-bold px-2 py-1 bg-slate-800 text-white rounded cursor-pointer"
            >
              Add
            </button>
          </div>
        )}

        {/* Children */}
        {isOpen && (
          <div>
            {node.children.map((child) => renderFolderNode(child, depth + 1))}
            {node.templates.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  switchBlueprint(t.id);
                  setViewMode("edit");
                }}
                className={`w-full text-left flex items-center gap-1.5 py-1 text-xs truncate cursor-pointer transition-colors ${
                  !isViewingLive && selectedBlueprintId === t.id
                    ? "font-bold text-[#257e45] bg-[#e8f5ee] dark:bg-[#1a5c31]/20"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
                }`}
                style={{ paddingLeft: depth * 12 + 24 }}
              >
                <span className="shrink-0">📄</span>
                <span className="truncate">{t.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Chevron pipeline selector ───────────────────────────────────────────────

  const renderChevronBar = () => {
    const pipes = currentBlueprint?.pipelines || [];
    const total = pipes.length;

    return (
      <div className="flex items-stretch w-full overflow-x-auto select-none" style={{ minHeight: 40 }}>
        {pipes.map((pipe, idx) => {
          const isActive = pipe.id === (currentPipeline?.id || pipes[0]?.id);
          const isFirst = idx === 0;
          const isLast = idx === total - 1;
          const isRenaming = renamingPipelineId === pipe.id;

          return (
            <div
              key={pipe.id}
              className="relative flex items-center shrink-0 group"
              style={{
                flex: "1 1 0%",
                minWidth: 110,
                zIndex: isActive ? 2 : 1,
              }}
            >
              {/* Chevron shape via clip-path */}
              <div
                onClick={() => !isLast && setActivePipelineId(pipe.id)}
                style={{
                  background: isActive ? PD_GREEN : "#f0f0f0",
                  clipPath: isFirst
                    ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
                    : isLast
                    ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)"
                    : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)",
                  marginLeft: isFirst ? 0 : -14,
                  color: isActive ? "#fff" : "#374151",
                  cursor: "pointer",
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: isFirst ? 16 : 28,
                  paddingRight: 20,
                  width: "100%",
                  position: "relative",
                  transition: "background 0.15s",
                  borderTop: isActive ? "none" : "1px solid #d1d5db",
                  borderBottom: isActive ? "none" : "1px solid #d1d5db",
                }}
                className="dark:border-zinc-600"
                title={pipe.name}
              >
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renamePipelineValue}
                    onChange={(e) => setRenamePipelineValue(e.target.value)}
                    onBlur={() => handleRenamePipeline(pipe.id, renamePipelineValue)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenamePipeline(pipe.id, renamePipelineValue);
                      if (e.key === "Escape") setRenamingPipelineId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white text-slate-900 text-xs font-bold px-1.5 py-0.5 rounded w-full focus:outline-none border border-slate-300"
                    style={{ minWidth: 0 }}
                  />
                ) : (
                  <span className="text-[11px] font-bold truncate leading-tight">{pipe.name}</span>
                )}

                {/* Hover pencil to rename */}
                {!isRenaming && !currentBlueprint.isLive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingPipelineId(pipe.id);
                      setRenamePipelineValue(pipe.name);
                    }}
                    className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] cursor-pointer"
                    style={{ color: isActive ? "rgba(255,255,255,0.7)" : "#9ca3af" }}
                    title="Rename pipeline"
                  >
                    ✎
                  </button>
                )}
              </div>

              {/* Reorder controls */}
              {isReorderingPipelines && !currentBlueprint.isLive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1 z-10 pb-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShiftPipeline(pipe.id, "left"); }}
                    disabled={idx === 0}
                    className="text-[9px] px-1 py-0.5 bg-white border border-slate-300 rounded disabled:opacity-30 cursor-pointer hover:bg-slate-100"
                  >◀</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShiftPipeline(pipe.id, "right"); }}
                    disabled={idx === total - 1}
                    className="text-[9px] px-1 py-0.5 bg-white border border-slate-300 rounded disabled:opacity-30 cursor-pointer hover:bg-slate-100"
                  >▶</button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add new pipeline chevron (dashed outline, scrunched) */}
        {!currentBlueprint.isLive && (
          <div
            className="relative flex items-center shrink-0"
            style={{ minWidth: 90, marginLeft: -14, zIndex: 0 }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const val = newStageName; // re-use for now — see below
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const name = prompt("New pipeline name:");
                  if (name) handleAddPipeline(name);
                }}
                style={{
                  clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)",
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 28,
                  paddingRight: 20,
                  width: "100%",
                  background: "transparent",
                  border: "2px dashed #9ca3af",
                  cursor: "pointer",
                  color: "#9ca3af",
                  fontSize: 11,
                  fontWeight: 700,
                }}
                className="hover:border-[#257e45] hover:text-[#257e45] transition-colors"
              >
                + Pipeline
              </button>
            </form>
          </div>
        )}

        {/* Reorder toggle */}
        {!currentBlueprint.isLive && (
          <button
            onClick={() => setIsReorderingPipelines((p) => !p)}
            className={`ml-3 shrink-0 text-[10px] font-bold px-2.5 py-1.5 border rounded self-center transition-colors cursor-pointer ${
              isReorderingPipelines
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-300 hover:border-slate-500 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600"
            }`}
          >
            ⇅ Reorder
          </button>
        )}

        {/* Delete pipeline button */}
        {!currentBlueprint.isLive && currentBlueprint.pipelines.length > 1 && currentPipeline && (
          <button
            onClick={() => handleDeletePipeline(currentPipeline.id)}
            className="ml-2 shrink-0 text-[10px] font-bold px-2.5 py-1.5 border border-red-200 text-red-500 bg-white hover:bg-red-50 rounded self-center cursor-pointer dark:bg-zinc-900 dark:border-red-900/40"
          >
            Delete
          </button>
        )}
      </div>
    );
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full w-full animate-fade-in font-sans">

      {/* ── TOP COMMAND BAR ── */}
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        {/* Left: Mode switcher */}
        <div className="flex items-center gap-2">
          {/* Sidebar toggle */}
          <button
            onClick={() => setIsSidebarOpen((p) => !p)}
            className="p-2 rounded text-slate-500 hover:text-slate-800 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <div className="bg-slate-100 dark:bg-zinc-800 p-1 rounded border border-slate-200 dark:border-zinc-700 flex items-center gap-0.5 text-xs font-bold">
            <button
              onClick={() => setViewMode("deploy")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewMode === "deploy"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-sm"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-700"
              }`}
            >
              <span>⚡</span> Deploy
            </button>
            <button
              onClick={() => setViewMode("edit")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewMode === "edit"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-sm"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-700"
              }`}
            >
              <span>🛠️</span> Edit
            </button>
          </div>
        </div>

        {/* Right: Connection popover */}
        <div className="flex items-center gap-3">
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setShowApiOverlay(!showApiOverlay)}
              className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold border transition cursor-pointer ${
                targetCompany
                  ? "bg-[#e8f5ee] border-[#a3d4b5] text-[#1a5c31] dark:bg-[#1a5c31]/20 dark:border-[#257e45]/40 dark:text-[#5fbe8a]"
                  : "bg-white border-slate-250 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 hover:bg-slate-50"
              }`}
            >
              {targetCompany ? (
                <>
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: PD_GREEN }}></span>
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: PD_GREEN }}></span>
                  </span>
                  <span className="truncate max-w-[140px]">{targetCompany}</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-zinc-500 inline-block shrink-0"></span>
                  <span>Connect</span>
                </>
              )}
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">▼</span>
            </button>

            {showApiOverlay && (
              <div className="absolute right-0 top-11 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-lg shadow-xl w-80 space-y-4">
                <div>
                  <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase block">HANDSHAKE NODE</span>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100 mt-0.5">API Connection Tunnel</h4>
                </div>
                {!targetCompany ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pipedrive REST Token</label>
                      <input
                        type="password"
                        placeholder="Authentication Token..."
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-zinc-950 dark:border-zinc-700 rounded px-2.5 py-2 text-xs font-mono focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleVerifyTarget}
                      disabled={isVerifying || !apiToken}
                      className="w-full text-white font-bold py-2 rounded text-xs transition cursor-pointer disabled:opacity-40"
                      style={{ background: PD_GREEN }}
                    >
                      {isVerifying ? "Verifying..." : "Connect Target Account"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded bg-[#e8f5ee] dark:bg-[#1a5c31]/20 border border-[#a3d4b5]/50 text-xs">
                      <div className="font-bold text-slate-800 dark:text-zinc-100 truncate">{targetCompany}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{targetAdmin}</div>
                    </div>
                    <button
                      onClick={() => { setIsViewingLive(true); setViewMode("edit"); setShowApiOverlay(false); }}
                      className="w-full font-bold py-2 rounded text-xs border transition cursor-pointer text-white"
                      style={{ background: PD_GREEN }}
                    >
                      View Live Account Setup
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="w-full bg-white border border-red-200 text-red-600 dark:bg-zinc-900 dark:border-red-900/40 dark:text-red-400 font-bold py-2 rounded text-xs transition cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── FOLDER SIDEBAR ── */}
        {isSidebarOpen && (
          <div className="w-56 shrink-0 border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden">
            {/* Sidebar header */}
            <div className="px-3 pt-3 pb-2 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase font-mono">Templates</span>
              <button
                onClick={() => { setAddingTemplateTo(null); setNewTemplateName(""); setAddingTemplateTo("__root__"); }}
                className="text-slate-400 hover:text-[#257e45] cursor-pointer"
                title="New template at root"
              >
                <svg viewBox="0 0 12 12" className="w-3.5 h-3.5 fill-current"><path d="M5 0h2v5h5v2H7v5H5V7H0V5h5z"/></svg>
              </button>
            </div>

            {/* Scrollable tree */}
            <div className="flex-1 overflow-y-auto py-1.5 text-xs">

              {/* Live target node — only shown when connected */}
              {targetCompany && (
                <button
                  onClick={() => { setIsViewingLive(true); setViewMode("edit"); }}
                  className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                    isViewingLive
                      ? "text-[#1a5c31] bg-[#e8f5ee] dark:bg-[#1a5c31]/20 font-bold"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: PD_GREEN }}></span>
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: PD_GREEN }}></span>
                  </span>
                  <span className="truncate">Live Account Setup</span>
                </button>
              )}

              {/* Separator */}
              {targetCompany && <div className="h-px bg-slate-100 dark:bg-zinc-800 mx-3 my-1.5" />}

              {/* Root-level templates */}
              {rootTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { switchBlueprint(t.id); setViewMode("edit"); }}
                  className={`w-full text-left flex items-center gap-1.5 px-3 py-1.5 text-xs truncate cursor-pointer transition-colors ${
                    !isViewingLive && selectedBlueprintId === t.id
                      ? "font-bold text-[#257e45] bg-[#e8f5ee] dark:bg-[#1a5c31]/20"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <span>📄</span>
                  <span className="truncate">{t.name}</span>
                </button>
              ))}

              {/* Add root template inline input */}
              {addingTemplateTo === "__root__" && (
                <div className="flex items-center gap-1 px-3 py-1">
                  <input
                    autoFocus
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateTemplateInFolder(null, newTemplateName);
                      if (e.key === "Escape") setAddingTemplateTo(null);
                    }}
                    placeholder="Template name..."
                    className="flex-1 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-600 rounded px-2 py-0.5 text-xs focus:outline-none"
                  />
                  <button
                    onClick={() => handleCreateTemplateInFolder(null, newTemplateName)}
                    className="text-[10px] font-bold px-2 py-1 bg-slate-800 text-white rounded cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Folder tree */}
              {folderTree.map((node) => renderFolderNode(node, 0))}
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 overflow-y-auto flex flex-col min-w-0">

          {/* ── DEPLOY MODE ── */}
          {viewMode === "deploy" && (
            <div className="flex-1 p-6 space-y-6 max-w-5xl w-full mx-auto">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-zinc-100">Deploy Mode</h1>
                <p className="text-xs text-slate-500 mt-0.5">Connect to your Pipedrive account and push the active template configuration.</p>
              </div>

              {/* Target status */}
              <div className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 rounded flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Target Account</div>
                  {targetCompany ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: PD_GREEN }}></span>
                      <span className="text-sm font-bold text-slate-800 dark:text-zinc-100">{targetCompany}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse inline-block"></span>
                      <span className="text-sm font-bold text-slate-500">No connection. Click Connect above.</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Active Template</div>
                  <div className="text-sm font-bold text-slate-700 dark:text-zinc-200 mt-1 truncate max-w-[200px]">
                    {currentBlueprint?.name || "None"}
                  </div>
                </div>
              </div>

              {/* Live Discovery Inspector */}
              {livePipelines.length > 0 && (
                <div className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">Live Account</span>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 mt-0.5">Discovery Inspector</h3>
                    </div>
                    <button
                      onClick={() => { setIsViewingLive(true); setViewMode("edit"); }}
                      className="text-xs font-bold px-3 py-1.5 text-white rounded cursor-pointer transition"
                      style={{ background: PD_GREEN }}
                    >
                      View in Editor →
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-64 overflow-y-auto">
                    {livePipelines.map((pipe) => (
                      <div key={pipe.id} className="px-4 py-3">
                        <div className="text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1.5">{pipe.name}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {pipe.stages.map((stage, si) => (
                            <span
                              key={stage.id}
                              className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400"
                            >
                              {si + 1}. {stage.name}
                              {stage.rottenDays ? ` ⌛${stage.rottenDays}d` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deploy button */}
              <button
                onClick={handleDeploy}
                disabled={!targetCompany || isDeploying}
                className="w-full py-3.5 text-sm font-bold text-white rounded tracking-wide transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
                style={{ background: (!targetCompany || isDeploying) ? "#6b7280" : PD_GREEN }}
              >
                {isDeploying ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deploying...
                  </>
                ) : (
                  <>⚡ Run Atomic Deployment</>
                )}
              </button>

              {/* Activity log */}
              {logs.length > 0 && (
                <div className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded overflow-hidden">
                  <button
                    onClick={() => setLogsExpanded((p) => !p)}
                    className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
                    <span>Activity Log <span className="ml-2 font-mono bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-slate-500">{logs.length}</span></span>
                    <span className="text-slate-400">{logsExpanded ? "▲" : "▼"}</span>
                  </button>
                  {logsExpanded && (
                    <div className="border-t border-slate-100 dark:border-zinc-800 p-4 max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px] bg-slate-50 dark:bg-zinc-950/50">
                      {logs.map((log, i) => (
                        <div key={i} className={log.includes("✓") ? "text-[#257e45]" : log.includes("✗") ? "text-red-500" : "text-slate-600 dark:text-zinc-400"}>
                          <span className="text-slate-400 mr-2">{String(i + 1).padStart(2, "0")}.</span>
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── EDIT MODE ── */}
          {viewMode === "edit" && (
            <div className="flex flex-col flex-1 min-h-0">

              {/* Edit header bar */}
              <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Live badge */}
                  {currentBlueprint.isLive && (
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded text-white" style={{ background: PD_GREEN }}>
                      ⚡ LIVE
                    </span>
                  )}

                  {/* Editable template title */}
                  {isEditingTitle && !currentBlueprint.isLive ? (
                    <input
                      ref={titleInputRef}
                      autoFocus
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleTitleSave();
                        if (e.key === "Escape") { setIsEditingTitle(false); setTitleValue(currentBlueprint.name); }
                      }}
                      className="text-lg font-extrabold bg-transparent border-b-2 text-slate-900 dark:text-zinc-100 focus:outline-none min-w-0"
                      style={{ borderColor: PD_GREEN }}
                    />
                  ) : (
                    <h1
                      onClick={() => { if (!currentBlueprint.isLive) { setIsEditingTitle(true); setTitleValue(currentBlueprint.name); } }}
                      className={`text-lg font-extrabold text-slate-900 dark:text-zinc-100 truncate ${!currentBlueprint.isLive ? "cursor-text hover:border-b-2 hover:border-slate-300" : ""}`}
                      title={!currentBlueprint.isLive ? "Click to rename" : ""}
                    >
                      {currentBlueprint.name}
                    </h1>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Live: Save As snapshot */}
                  {currentBlueprint.isLive && (
                    <button
                      onClick={openLiveSaveAs}
                      className="text-xs font-bold px-3 py-2 rounded border border-[#257e45] text-[#257e45] hover:bg-[#e8f5ee] cursor-pointer transition"
                    >
                      Save As Snapshot...
                    </button>
                  )}

                  {/* Standard: save / save as / custom fields / export / import */}
                  {!currentBlueprint.isLive && (
                    <>
                      <button
                        onClick={handleDirectSave}
                        className={`text-xs font-bold px-3 py-2 rounded text-white transition cursor-pointer ${saveSuccess ? "opacity-100" : ""}`}
                        style={{ background: saveSuccess ? "#16a34a" : PD_GREEN }}
                      >
                        {saveSuccess ? "✓ Saved" : "Save"}
                      </button>
                      <button
                        onClick={openSaveAsModal}
                        className="text-xs font-bold px-3 py-2 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 cursor-pointer"
                      >
                        Save As...
                      </button>
                      <button
                        onClick={() => setIsFieldsModalOpen(true)}
                        className="text-xs font-bold px-3 py-2 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 cursor-pointer"
                      >
                        Fields ({currentBlueprint?.customFields?.length || 0})
                      </button>
                      <button
                        onClick={handleExportSetupImage}
                        title="Export JSON"
                        className="p-2 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 cursor-pointer"
                      >
                        📤
                      </button>
                      <label
                        htmlFor="import-backup"
                        title="Import JSON"
                        className="p-2 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 cursor-pointer inline-flex items-center"
                      >
                        📥
                      </label>
                      <input id="import-backup" type="file" accept=".json" onChange={handleImportSetupImage} className="hidden" />
                    </>
                  )}
                </div>
              </div>

              {/* Chevron Pipeline Selection Bar */}
              <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-4 md:px-6 py-2.5 flex items-center gap-0 shrink-0">
                {renderChevronBar()}
              </div>

              {/* Kanban Canvas — full width */}
              <div
                className="flex-1 overflow-x-auto overflow-y-auto"
                style={{ background: "#f5f6f7" }}
              >
                <div className="flex items-start gap-0 h-full" style={{ minHeight: "100%" }}>

                  {/* Stage columns */}
                  {currentPipeline?.stages.map((stage, sIdx) => (
                    <div
                      key={stage.id}
                      className="shrink-0 flex flex-col"
                      style={{
                        width: 240,
                        borderRight: "1px solid #e5e7eb",
                        minHeight: "100%",
                        background: "#fff",
                      }}
                    >
                      {/* Column header */}
                      <div
                        className="border-b-4 px-3 py-2 flex items-center justify-between"
                        style={{
                          borderColor: sIdx < 3 ? PD_GREEN : "#d1d5db",
                          borderBottomWidth: 3,
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={stage.name}
                            onChange={(e) => !currentBlueprint.isLive && handleUpdateStageName(stage.id, e.target.value)}
                            readOnly={!!currentBlueprint.isLive}
                            className="text-xs font-bold text-slate-800 dark:text-zinc-100 w-full bg-transparent border-none focus:outline-none focus:bg-white focus:px-1 focus:rounded transition"
                          />
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {stage.rottenDays ? `${stage.rottenDays}d stagnation` : "continuous"}
                          </div>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 ml-2 shrink-0">#{sIdx + 1}</div>
                      </div>

                      {/* Rotten days editor */}
                      {!currentBlueprint.isLive && (
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-slate-400 uppercase">Rotten</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="—"
                              value={stage.rottenDays ?? ""}
                              onChange={(e) => handleUpdateRottenDays(stage.id, e.target.value ? parseInt(e.target.value) : null)}
                              className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:border-slate-400"
                            />
                            <span className="text-[9px] text-slate-400">days</span>
                          </div>
                        </div>
                      )}

                      {/* Sample deal card */}
                      <div className="px-3 py-2.5">
                        <div
                          className="border border-slate-200 bg-white p-2.5 text-xs"
                          style={{ borderRadius: 2 }}
                        >
                          <div className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">Sample Deal</div>
                          <div className="font-semibold text-slate-700 mt-0.5">Stage Placement Test {sIdx + 1}</div>
                        </div>
                      </div>

                      {/* Stage actions */}
                      {!currentBlueprint.isLive && (
                        <div className="px-3 py-2 mt-auto border-t border-slate-100 flex gap-2">
                          <button
                            onClick={() => handleDuplicateStage(stage.id)}
                            className="text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer font-medium"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => handleDeleteStage(stage.id)}
                            className="text-[10px] text-red-500 hover:text-red-700 cursor-pointer font-medium ml-auto"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add stage column */}
                  {!currentBlueprint.isLive && currentPipeline && (
                    <div
                      className="shrink-0 flex flex-col items-center justify-start pt-6 px-3"
                      style={{
                        width: 200,
                        minHeight: "100%",
                        borderRight: "1px solid #e5e7eb",
                        background: "#fafafa",
                      }}
                    >
                      <div
                        className="border-2 border-dashed border-slate-300 hover:border-[#257e45] w-full flex flex-col gap-2 p-3 transition-colors group"
                        style={{ borderRadius: 2 }}
                      >
                        <span className="text-[10px] text-slate-400 group-hover:text-[#257e45] font-bold uppercase tracking-widest">New Stage</span>
                        <input
                          type="text"
                          placeholder="Stage name..."
                          value={newStageName}
                          onChange={(e) => setNewStageName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { handleAddStage(newStageName); } }}
                          className="w-full text-xs border border-slate-200 bg-white px-2 py-1.5 focus:outline-none focus:border-slate-400"
                          style={{ borderRadius: 2 }}
                        />
                        <button
                          onClick={() => handleAddStage(newStageName)}
                          disabled={!newStageName.trim()}
                          className="w-full text-xs font-bold py-1.5 text-white disabled:opacity-40 cursor-pointer transition"
                          style={{ background: PD_GREEN, borderRadius: 2 }}
                        >
                          + Add Stage
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Live: Save As banner */}
                  {currentBlueprint.isLive && (
                    <div className="shrink-0 flex flex-col items-center justify-start pt-6 px-4" style={{ minWidth: 220 }}>
                      <div className="border border-[#a3d4b5] bg-[#e8f5ee] p-3 w-full text-center space-y-2" style={{ borderRadius: 2 }}>
                        <div className="text-[10px] font-bold text-[#1a5c31] uppercase tracking-widest">Live View</div>
                        <p className="text-xs text-[#257e45]">This is a read-only view of your connected account.</p>
                        <button
                          onClick={openLiveSaveAs}
                          className="w-full text-xs font-bold py-2 text-white cursor-pointer transition"
                          style={{ background: PD_GREEN, borderRadius: 2 }}
                        >
                          Save As Snapshot
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── CUSTOM FIELDS MODAL ── */}
      {isFieldsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col" style={{ height: 580, borderRadius: 2 }}>
            <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">Custom Fields Dictionary</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">{currentBlueprint.name}</h3>
              </div>
              <button
                onClick={() => { setIsFieldsModalOpen(false); setEditingFieldId(null); }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-200/50 dark:bg-zinc-800 px-3 py-1.5 rounded cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-4">
              {fieldTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveFieldsTab(tab); setEditingFieldId(null); }}
                  className={`px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer ${
                    activeFieldsTab === tab
                      ? "border-[#257e45] text-[#257e45]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/2 border-r border-slate-200 dark:border-zinc-800 p-4 overflow-y-auto space-y-4 bg-slate-50/50 flex flex-col">
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded space-y-3 shrink-0">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Create Field</div>
                  <input
                    type="text"
                    placeholder="Field label..."
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomField(newFieldName, newFieldType); } }}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-2 text-xs focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="dropdown">Dropdown</option>
                      <option value="date">Date</option>
                      <option value="user">User</option>
                    </select>
                    <button
                      onClick={() => handleAddCustomField(newFieldName, newFieldType)}
                      className="text-white font-bold px-3 py-1.5 rounded text-xs cursor-pointer"
                      style={{ background: PD_GREEN }}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {getFieldsForTab(activeFieldsTab).length > 0 ? (
                    getFieldsForTab(activeFieldsTab).map((field) => (
                      <div
                        key={field.id}
                        onClick={() => setEditingFieldId(field.id)}
                        className={`p-3 border text-left cursor-pointer transition-all ${
                          editingFieldId === field.id
                            ? "border-[#257e45] bg-[#e8f5ee]/30"
                            : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300"
                        }`}
                        style={{ borderRadius: 2 }}
                      >
                        <div className="text-xs text-slate-900 dark:text-zinc-100 font-bold flex justify-between">
                          <span>{field.name}</span>
                          {field.type === "dropdown" && (
                            <span className="text-[9px] bg-slate-100 dark:bg-zinc-800 text-slate-500 px-1.5 py-0.5 font-mono">Options</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{field.scope} · {field.type}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 italic">No fields defined in this category.</div>
                  )}
                </div>
              </div>

              <div className="w-1/2 p-5 overflow-y-auto bg-white dark:bg-zinc-900">
                {editingFieldId ? (
                  (() => {
                    const field = currentBlueprint?.customFields.find((f) => f.id === editingFieldId);
                    if (!field) return null;
                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">{field.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{field.scope} · {field.type}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteCustomField(field.id)}
                            className="text-[10px] text-red-500 font-bold bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                        {field.type === "dropdown" ? (
                          <div className="space-y-3">
                            <div className="text-[11px] font-bold text-slate-500 font-mono">Dropdown Options</div>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {(field.options || []).map((opt, oi) => (
                                <div key={oi} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono" style={{ borderRadius: 2 }}>
                                  <span>{opt}</span>
                                  <button onClick={() => handleRemoveOptionFromField(field.id, opt)} className="text-red-500 text-[10px] cursor-pointer">Remove</button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                              <input
                                type="text"
                                placeholder="New option..."
                                value={newFieldOption}
                                onChange={(e) => setNewFieldOption(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddOptionToField(field.id); } }}
                                className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1.5 text-xs focus:outline-none"
                              />
                              <button
                                onClick={() => handleAddOptionToField(field.id)}
                                className="text-white font-bold px-3 py-1.5 text-xs cursor-pointer rounded"
                                style={{ background: PD_GREEN }}
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 border-2 border-dashed border-slate-200 text-center text-xs text-slate-400 italic" style={{ borderRadius: 2 }}>
                            Standard field — no options required.
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 italic pt-20">Select a field to configure it.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SAVE AS MODAL ── */}
      {isSaveAsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 max-w-lg w-full shadow-2xl overflow-hidden" style={{ borderRadius: 2 }}>
            <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">Save Template</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Save As New or Overwrite</h3>
              </div>
              <button onClick={() => setIsSaveAsOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-mono font-bold bg-slate-200/50 px-2 py-1 rounded cursor-pointer">Cancel</button>
            </div>
            <form onSubmit={handleSaveAsSubmit} className="p-6 space-y-4">
              {saveAsOverwriteId && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded flex items-start gap-2">
                  <span className="text-amber-500 text-base shrink-0">⚠️</span>
                  <div className="text-xs">
                    <span className="font-bold text-amber-800">Overwrite Target</span>
                    <p className="text-amber-700 mt-0.5">Will replace "{catalog.find((b) => b.id === saveAsOverwriteId)?.name}".</p>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Template Name</label>
                <input
                  type="text"
                  value={saveAsName}
                  onChange={(e) => setSaveAsName(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-600">Destination Folder</label>
                  <button type="button" onClick={() => setSaveAsIsNewFolder((p) => !p)} className="text-[10px] text-[#257e45] hover:underline cursor-pointer font-bold">
                    {saveAsIsNewFolder ? "Select Existing" : "+ New Folder"}
                  </button>
                </div>
                {saveAsIsNewFolder ? (
                  <input
                    type="text"
                    placeholder="New folder name..."
                    value={saveAsNewFolderInput}
                    onChange={(e) => setSaveAsNewFolderInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-3 py-2 text-xs focus:outline-none"
                  />
                ) : (
                  <select
                    value={saveAsFolder}
                    onChange={(e) => setSaveAsFolder(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="">(Root — No Folder)</option>
                    {Array.from(new Set(catalog.map((b) => b.folder).filter((f): f is string => !!f))).map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Or Overwrite Existing</label>
                <div className="border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 max-h-32 overflow-y-auto p-2 space-y-1 text-xs rounded">
                  {catalog.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => { setSaveAsName(b.name); setSaveAsFolder(b.folder || ""); setSaveAsIsNewFolder(false); setSaveAsOverwriteId(b.id); }}
                      className={`px-2.5 py-1.5 cursor-pointer transition flex justify-between ${saveAsOverwriteId === b.id ? "bg-amber-100 text-amber-700 font-bold" : "hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"}`}
                      style={{ borderRadius: 2 }}
                    >
                      <span className="truncate">{b.folder ? `${b.folder} / ${b.name}` : b.name}</span>
                      <span className="text-[9px] text-slate-400 shrink-0 ml-2">click to target</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <button type="button" onClick={() => setIsSaveAsOpen(false)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded text-xs font-semibold cursor-pointer">Cancel</button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white rounded cursor-pointer"
                  style={{ background: saveAsOverwriteId ? "#d97706" : PD_GREEN }}
                >
                  {saveAsOverwriteId ? "Overwrite" : "Save As New"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── LIVE SAVE AS MODAL ── */}
      {isLiveSaveAsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 max-w-md w-full shadow-2xl" style={{ borderRadius: 2 }}>
            <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">Snapshot Live Account</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Save As Snapshot</h3>
              </div>
              <button onClick={() => setIsLiveSaveAsOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-mono font-bold bg-slate-200/50 px-2 py-1 rounded cursor-pointer">Cancel</button>
            </div>
            <form onSubmit={handleLiveSaveAsSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Snapshot Name</label>
                <input
                  type="text"
                  value={liveSaveAsName}
                  onChange={(e) => setLiveSaveAsName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Folder (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Snapshots or leave blank..."
                  value={liveSaveAsFolder}
                  onChange={(e) => setLiveSaveAsFolder(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsLiveSaveAsOpen(false)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded text-xs font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white rounded cursor-pointer" style={{ background: PD_GREEN }}>
                  Save Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}