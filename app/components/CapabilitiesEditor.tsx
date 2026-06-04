"use client";
import React, { useState, useEffect } from 'react';
import { PipedriveCapabilitiesRegistry } from "@/types/blueprint";

type TabType = 'general' | 'triggers' | 'actions' | 'integrations' | 'conditions';

export default function CapabilitiesEditor({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<PipedriveCapabilitiesRegistry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('triggers');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/config/pipedrive')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/config/pipedrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('Failed to save configuration.');
      onClose();
    } catch {
      setSaving(false);
    }
  };

  if (loading) return <div className="fixed inset-0 bg-black/50 flex items-center justify-center text-white font-mono uppercase tracking-widest text-[10px]">Initializing Engine...</div>;
  if (!config) return <div className="fixed inset-0 bg-black/50 flex items-center justify-center text-white font-mono uppercase tracking-widest text-[10px]">Error loading configuration.</div>;

  const TabButton = ({ id, label }: { id: TabType, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${
        activeTab === id 
          ? 'border-[#004850] text-[#004850] dark:text-teal-400 dark:border-teal-400' 
          : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-sm w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER BAR */}
        <div className="h-14 px-6 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-black uppercase tracking-tighter text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#004850] rounded-full animate-pulse" />
              Pipedrive Capability Canvas
            </h2>
            <div className="h-4 w-[1px] bg-zinc-200 dark:border-zinc-800" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">v.{config.meta.version}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-6 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
          <div className="flex gap-2">
            <TabButton id="general" label="General" />
            <TabButton id="triggers" label="Triggers" />
            <TabButton id="actions" label="Native Actions" />
            <TabButton id="integrations" label="Integrations" />
            <TabButton id="conditions" label="Logic Gateways" />
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              placeholder="SEARCH CAPABILITIES..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-[10px] font-mono tracking-widest uppercase focus:ring-0 placeholder:text-zinc-500 w-48 text-right"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'general' && <GeneralTab config={config} setConfig={setConfig} />}
          {activeTab === 'triggers' && <TriggersTab config={config} setConfig={setConfig} searchQuery={searchQuery} />}
          {activeTab === 'actions' && <ActionsTab config={config} setConfig={setConfig} searchQuery={searchQuery} />}
          {activeTab === 'integrations' && <IntegrationsTab config={config} />}
          {activeTab === 'conditions' && <ConditionsTab config={config} />}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            <span className="text-[#004850] font-bold">●</span> SYSTEM READY FOR DEPLOYMENT
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 border border-zinc-200 dark:border-zinc-800 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">Cancel</button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="px-6 py-2 bg-[#004850] text-white rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-[#003840] disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-teal-900/10"
            >
              {saving ? 'Synchronizing...' : 'Save Capabilities'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function FieldPillEditor({ fields, onChange }: { fields: string[], onChange: (newFields: string[]) => void }) {
  const [inputValue, setInputValue] = useState('');

  const removeField = (field: string) => {
    onChange(fields.filter(f => f !== field));
  };

  const addField = () => {
    if (inputValue.trim() && !fields.includes(inputValue.trim())) {
      onChange([...fields, inputValue.trim()]);
      setInputValue('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border border-zinc-200 dark:border-zinc-800 rounded-sm bg-zinc-50 dark:bg-zinc-900/30">
        {fields.map(field => (
          <div key={field} className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-sm shadow-sm group">
            <span className="text-[10px] font-mono uppercase text-zinc-600 dark:text-zinc-300">{field}</span>
            <button onClick={() => removeField(field)} className="text-zinc-400 hover:text-red-500 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
        {fields.length === 0 && <span className="text-[10px] font-mono text-zinc-400 italic">No fields monitored...</span>}
      </div>
      <div className="flex gap-2">
        <input 
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addField())}
          placeholder="ADD FIELD KEY (e.g. status, value, cf_my_custom_field)"
          className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 text-[10px] font-mono uppercase tracking-wider focus:border-[#004850] focus:ring-0 outline-none"
        />
        <button 
          onClick={addField}
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-200"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string, description?: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">{title}</h3>
      {description && <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">{description}</p>}
      <div className="h-[1px] w-full bg-zinc-200 dark:bg-zinc-800 mt-4" />
    </div>
  );
}

function GeneralTab({ config, setConfig }: { config: PipedriveCapabilitiesRegistry, setConfig: React.Dispatch<React.SetStateAction<PipedriveCapabilitiesRegistry | null>> }) {
  return (
    <div className="max-w-3xl space-y-12">
      <section>
        <SectionHeader title="Engine Metadata" description="Core system identifiers and versioning for the Pipedrive Automation Engine." />
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Engine Version</label>
            <input 
              value={config.meta.version} 
              onChange={e => setConfig({...config, meta: {...config.meta, version: e.target.value}})}
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm text-xs font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Engine Descriptor</label>
            <input 
              value={config.meta.engine} 
              onChange={e => setConfig({...config, meta: {...config.meta, engine: e.target.value}})}
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm text-xs font-mono"
            />
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="Governance & Limits" description="Operational constraints enforced during automation execution." />
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Delay (Days)</label>
            <input 
              type="number"
              value={config.meta.governanceLimits.maxDelayDays} 
              onChange={e => setConfig({...config, meta: {...config.meta, governanceLimits: {...config.meta.governanceLimits, maxDelayDays: parseInt(e.target.value)}}})}
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm text-xs font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Max Monitored Fields</label>
            <input 
              type="number"
              value={config.meta.governanceLimits.maxMonitoredFieldsPerUpdateTrigger} 
              onChange={e => setConfig({...config, meta: {...config.meta, governanceLimits: {...config.meta.governanceLimits, maxMonitoredFieldsPerUpdateTrigger: parseInt(e.target.value)}}})}
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm text-xs font-mono"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function TriggersTab({ config, setConfig, searchQuery }: { config: PipedriveCapabilitiesRegistry, setConfig: React.Dispatch<React.SetStateAction<PipedriveCapabilitiesRegistry | null>>, searchQuery: string }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newScope, setNewScope] = useState('');

  const filteredEventTriggers = config.triggers.eventBased.filter(t => 
    t.scope.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.subOptionsMonitoredFields.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addTrigger = () => {
    if (!newScope.trim()) return;
    const exists = config.triggers.eventBased.some(t => t.scope === newScope.trim().toLowerCase());
    if (exists) return;

    const newTrigger = {
      scope: newScope.trim().toLowerCase(),
      events: ["added", "updated", "deleted"],
      subOptionsMonitoredFields: ["id"]
    };

    setConfig({
      ...config,
      triggers: {
        ...config.triggers,
        eventBased: [...config.triggers.eventBased, newTrigger]
      }
    });
    setNewScope('');
    setIsAdding(false);
  };

  const removeTrigger = (scope: string) => {
    setConfig({
      ...config,
      triggers: {
        ...config.triggers,
        eventBased: config.triggers.eventBased.filter(t => t.scope !== scope)
      }
    });
  };

  return (
    <div className="space-y-12">
      <section>
        <div className="flex items-center justify-between mb-6">
          <SectionHeader title="Event-Based Triggers" description="Define which Pipedrive objects and fields trigger automations upon modification." />
          <button 
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            Add New Trigger
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {isAdding && (
            <div className="bg-zinc-50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-6 rounded-sm flex flex-col justify-center gap-4">
              <input 
                autoFocus
                value={newScope}
                onChange={e => setNewScope(e.target.value)}
                placeholder="SCOPE NAME (e.g. quote, invoice, goal)"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-[10px] font-mono uppercase tracking-widest outline-none focus:border-[#004850]"
              />
              <div className="flex gap-2">
                <button onClick={addTrigger} className="flex-1 py-2 bg-[#004850] text-white text-[10px] font-bold uppercase tracking-widest">Confirm Scope</button>
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest">Cancel</button>
              </div>
            </div>
          )}

          {filteredEventTriggers.map((trigger) => (
            <div key={trigger.scope} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-sm shadow-sm relative group">
              <button 
                onClick={() => removeTrigger(trigger.scope)}
                className="absolute top-4 right-4 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-8 ${trigger.scope === 'deal' ? 'bg-[#1B5E20]' : 'bg-[#1B3A6B]'}`} />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">{trigger.scope}</h4>
                    <div className="flex gap-2 mt-1">
                      {trigger.events.map(evt => (
                        <span key={evt} className="text-[9px] font-mono text-zinc-500 uppercase bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-sm">{evt}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Monitored Fields</label>
              <FieldPillEditor 
                fields={trigger.subOptionsMonitoredFields} 
                onChange={(newFields) => {
                  const originalIdx = config.triggers.eventBased.findIndex(t => t.scope === trigger.scope);
                  if (originalIdx === -1) return;
                  const newTriggers = [...config.triggers.eventBased];
                  newTriggers[originalIdx].subOptionsMonitoredFields = newFields;
                  setConfig({...config, triggers: {...config.triggers, eventBased: newTriggers}});
                }} 
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Date-Based Triggers" description="Triggers based on specific dates or times associated with Pipedrive objects." />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {config.triggers.dateBased.map((trigger) => (
            <div key={trigger.scope} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-sm shadow-sm">
               <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-4">{trigger.scope} Monitoring</h4>
               <div className="space-y-4">
                 <div>
                   <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Supported Date Fields</label>
                   <div className="flex flex-wrap gap-2">
                     {trigger.supportedDateFields.map(field => (
                       <span key={field} className="text-[10px] font-mono uppercase bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-sm">{field}</span>
                     ))}
                   </div>
                 </div>
                 <div className="flex gap-8">
                   <div>
                     <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Operators</label>
                     <div className="flex gap-2">
                        {trigger.operators.map(op => <span key={op} className="text-[9px] font-mono uppercase text-[#004850]">{op.replace('_', ' ')}</span>)}
                     </div>
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Precision</label>
                     <div className="text-[9px] font-mono uppercase text-zinc-500">
                       {trigger.timeOffsets.allowHours && 'Hours'} {trigger.timeOffsets.allowDays && 'Days'} Supported
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ActionsTab({ config, setConfig, searchQuery }: { config: PipedriveCapabilitiesRegistry, setConfig: React.Dispatch<React.SetStateAction<PipedriveCapabilitiesRegistry | null>>, searchQuery: string }) {
  const [addingToScope, setAddingToScope] = useState<string | null>(null);
  const [newActionName, setNewActionName] = useState('');
  const scopes = Object.keys(config.nativeInternalActions);
  
  const addAction = (scope: string) => {
    if (!newActionName.trim()) return;
    const exists = config.nativeInternalActions[scope].some(a => a.action === newActionName.trim().toLowerCase());
    if (exists) return;

    const newAction = {
      action: newActionName.trim().toLowerCase(),
      description: `User-defined action for ${scope}.`,
      parameters: ["id"]
    };

    setConfig({
      ...config,
      nativeInternalActions: {
        ...config.nativeInternalActions,
        [scope]: [...config.nativeInternalActions[scope], newAction]
      }
    });
    setNewActionName('');
    setAddingToScope(null);
  };

  const removeAction = (scope: string, actionName: string) => {
    setConfig({
      ...config,
      nativeInternalActions: {
        ...config.nativeInternalActions,
        [scope]: config.nativeInternalActions[scope].filter(a => a.action !== actionName)
      }
    });
  };

  return (
    <div className="space-y-12">
      {scopes.map(scope => {
        const actions = config.nativeInternalActions[scope].filter(a => 
          a.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (a.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (actions.length === 0 && searchQuery) return null;

        return (
          <section key={scope}>
            <div className="flex items-center justify-between mb-6">
              <SectionHeader title={`${scope} Actions`} description={`Core native capabilities for ${scope} record management.`} />
              <button 
                onClick={() => setAddingToScope(scope)}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-[9px] font-bold uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-2"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                New {scope} Action
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {addingToScope === scope && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-sm flex flex-col gap-3">
                  <input 
                    autoFocus
                    value={newActionName}
                    onChange={e => setNewActionName(e.target.value)}
                    placeholder="ACTION NAME..."
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 text-[10px] font-mono uppercase outline-none focus:border-[#004850]"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => addAction(scope)} className="flex-1 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-bold uppercase tracking-widest">Add</button>
                    <button onClick={() => setAddingToScope(null)} className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-[9px] font-bold uppercase tracking-widest">Cancel</button>
                  </div>
                </div>
              )}

              {actions.map((action, aIdx) => (
                <div key={aIdx} className="group p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm hover:border-[#004850] transition-colors relative">
                  <button 
                    onClick={() => removeAction(scope, action.action)}
                    className="absolute top-2 right-2 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 mb-1">{action.action.replace(/_/g, ' ')}</h5>
                  <p className="text-[10px] text-zinc-500 leading-relaxed mb-3 h-8 overflow-hidden">{action.description || 'Native system operation.'}</p>
                  
                  {action.parameters && (
                    <div className="flex flex-wrap gap-1">
                      {action.parameters.slice(0, 4).map(p => (
                        <span key={p} className="text-[8px] font-mono uppercase bg-zinc-50 dark:bg-zinc-800 px-1 py-0.5 rounded-sm">{p}</span>
                      ))}
                      {action.parameters.length > 4 && <span className="text-[8px] font-mono uppercase text-zinc-400">+{action.parameters.length - 4} more</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function IntegrationsTab({ config }: { config: PipedriveCapabilitiesRegistry }) {
  const integrationNames = Object.keys(config.supportedIntegrations);

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {integrationNames.map(name => {
          const integration = config.supportedIntegrations[name];
          return (
            <div key={name} className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-6 rounded-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-sm flex items-center justify-center font-black text-xs">
                  {name[0]}
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em]">{name}</h4>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{integration.id}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Available Actions</label>
                {integration.actions.map(action => (
                  <div key={action.id} className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-2">{action.id.split('.').pop()?.replace(/_/g, ' ')}</div>
                    <div className="flex flex-wrap gap-1">
                      {action.subOptions?.map(opt => (
                        <span key={opt} className="text-[8px] font-mono uppercase bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 rounded-sm">{opt}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConditionsTab({ config }: { config: PipedriveCapabilitiesRegistry }) {
  return (
    <div className="space-y-12">
      <section>
        <SectionHeader title="Evaluation Gates & Control Flow" description="Logic nodes used to branch, delay, or wait for specific conditions within a workflow." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.controlFlow.map(node => (
            <div key={node.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wider">{node.id.replace(/_/g, ' ')}</h5>
                <span className="text-[8px] font-mono uppercase bg-[#E8DAEF] text-[#4A148C] px-1.5 py-0.5 rounded-sm">{node.type}</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">{node.behavior}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Condition Operators" description="Comparison methods available for evaluating field values." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h6 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Active Operators (Triggers)</h6>
            <div className="space-y-2">
              {config.conditionOperators.active.map(op => (
                <div key={op.id} className="p-3 border border-zinc-100 dark:border-zinc-800 rounded-sm">
                  <div className="text-[10px] font-bold uppercase">{op.label}</div>
                  <div className="text-[9px] text-zinc-400 mt-0.5">{op.description}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h6 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Passive Operators (Filters)</h6>
            <div className="flex flex-wrap gap-2">
              {config.conditionOperators.passive.map(op => (
                <span key={op.id} className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider rounded-sm">{op.label}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

