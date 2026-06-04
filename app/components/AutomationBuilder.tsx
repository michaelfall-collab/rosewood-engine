"use client";
import React from 'react';
import { CRMArchitectureBlueprint, PipedriveLegoAutomationBlock, PipedriveCapabilitiesRegistry } from "@/types/blueprint";
import { formatKey } from "@/utils/formatters";

interface AutomationBuilderProps {
  blueprint: CRMArchitectureBlueprint;
  capabilities: PipedriveCapabilitiesRegistry;
  onUpdate: (updated: CRMArchitectureBlueprint) => void;
}

export default function AutomationBuilder({ blueprint, onUpdate }: AutomationBuilderProps) {
  const automations = blueprint.legoAutomations || [];

  const updateBlock = (idx: number, updatedBlock: PipedriveLegoAutomationBlock) => {
    const newAutomations = [...automations];
    newAutomations[idx] = updatedBlock;
    onUpdate({ ...blueprint, legoAutomations: newAutomations });
  };

  const removeBlock = (idx: number) => {
    const newAutomations = automations.filter((_, i) => i !== idx);
    onUpdate({ ...blueprint, legoAutomations: newAutomations });
  };

  const addEmptyBlock = () => {
    const newBlock: PipedriveLegoAutomationBlock = {
      automationNumber: `G.0.${automations.length + 1}`,
      name: "New Automation",
      description: "Describe the purpose...",
      trigger: { scope: 'deal', event: 'updated' },
      conditions: [],
      actions: [],
      governanceNotes: ""
    };
    onUpdate({ ...blueprint, legoAutomations: [...automations, newBlock] });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Automation Playground</h2>
        <button onClick={addEmptyBlock} className="px-4 py-2 bg-[#004850] text-white text-[10px] font-bold uppercase rounded-sm hover:bg-[#003840]">New Automation</button>
      </div>

      {automations.map((block, bIdx) => (
        <div key={bIdx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-4 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-[10px] font-mono text-[#004850] font-bold">{block.automationNumber}</span>
            <input value={block.name} onChange={e => updateBlock(bIdx, { ...block, name: e.target.value })} className="font-bold uppercase text-xs w-48 border-none" />
            <button onClick={() => removeBlock(bIdx)} className="text-zinc-400 hover:text-red-500">Delete</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
                <span className="text-[9px] font-bold uppercase text-zinc-500">TRIGGER: {formatKey(block.trigger.scope)} {formatKey(block.trigger.event)}</span>
            </div>
            
            <div className="space-y-2">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block border-b border-zinc-100 dark:border-zinc-800 pb-1">Conditions</label>
                {block.conditions.map((cond, cIdx) => (
                    <div key={cIdx} className="p-2 text-[10px] bg-zinc-100 dark:bg-zinc-800 rounded-sm">
                        {formatKey(cond.field)} {cond.operator.replace(/_/g, ' ')} &quot;{cond.value}&quot;
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block border-b border-zinc-100 dark:border-zinc-800 pb-1">Actions</label>
                {block.actions.map((action, aIdx) => (
                    <div key={aIdx} className="p-2 text-[10px] bg-zinc-100 dark:bg-zinc-800 rounded-sm">
                        {formatKey(action.type)}: {formatKey(action.scope)}
                    </div>
                ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
