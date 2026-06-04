"use client";
import React, { useState, useEffect } from 'react';
import { PipedriveCapabilitiesRegistry } from "@/types/blueprint";

export default function CapabilitiesEditor({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<PipedriveCapabilitiesRegistry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/config/pipedrive')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load configuration.');
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/config/pipedrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('Failed to save configuration.');
      onClose();
    } catch (e) {
      setError('Failed to save configuration. Please try again.');
      setSaving(false);
    }
  };

  if (loading) return <div className="fixed inset-0 bg-black/50 flex items-center justify-center text-white">Loading Editor...</div>;
  if (!config) return <div className="fixed inset-0 bg-black/50 flex items-center justify-center text-white">Error loading configuration.</div>;

  return (
    <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Manage System Capabilities</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
            <i className="ti ti-x" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* META SECTION */}
          <section className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Core Metadata</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Engine Version
                <input value={config.meta.version} onChange={e => setConfig({...config, meta: {...config.meta, version: e.target.value}})} className="mt-1 w-full p-2 border rounded text-sm bg-white dark:bg-zinc-900" />
              </label>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Engine Name
                <input value={config.meta.engine} onChange={e => setConfig({...config, meta: {...config.meta, engine: e.target.value}})} className="mt-1 w-full p-2 border rounded text-sm bg-white dark:bg-zinc-900" />
              </label>
            </div>
          </section>

          {/* TRIGGERS SECTION */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Event Triggers</h3>
            <div className="space-y-4">
              {config.triggers.eventBased.map((trigger, tIdx) => (
                <div key={tIdx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-sm">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-xs font-bold capitalize text-zinc-800 dark:text-zinc-200">{trigger.scope}</span>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {trigger.events.map((evt, eIdx) => (
                        <span key={eIdx} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] uppercase font-mono">{evt}</span>
                      ))}
                    </div>
                  </div>
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-widest mt-2">Monitored Fields</label>
                  <textarea 
                    value={trigger.subOptionsMonitoredFields.join(', ')}
                    onChange={e => {
                        const newFields = e.target.value.split(',').map(s => s.trim());
                        const newTriggers = [...config.triggers.eventBased];
                        newTriggers[tIdx].subOptionsMonitoredFields = newFields;
                        setConfig({...config, triggers: {...config.triggers, eventBased: newTriggers}});
                    }}
                    className="w-full mt-1 p-2 border rounded text-[11px] font-mono"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-4 py-2 bg-[#004850] text-white rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-[#003840] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Capabilities'}
          </button>
        </div>
      </div>
    </div>
  );
}
