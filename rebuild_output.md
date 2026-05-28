# Rebuild Manifest: Rosewood High-Velocity SPA

This manifest outlines the technical transformation of the Rosewood CRM Engine from a multi-page routing architecture to a single-state dashboard.

## 1. Architectural Consolidation
| Current Path | New SPA Location | Action |
|--------------|------------------|--------|
| `/` (Launchpad) | `app/page.tsx` | Refactored into "Cockpit" dashboard |
| `/core` | Detail Modal > API JSON | Pruned; logic moved to Modal |
| `/studio` | Automation Builder Modal | Pruned; logic moved to Modal |
| `/vault` | Header > Import/Export | Pruned; logic moved to Global Actions |

## 2. File System Pruning
```bash
# Execute to clean up multi-page routes
rm -rf app/core app/studio app/vault
```

## 3. Updated `app/layout.tsx` (Summary)
Remove the sidebar navigation to allow the dashboard to occupy 100% of the viewport.
- **Change:** Remove `<nav>` element.
- **Change:** Update `<main>` classes: `flex-1 overflow-y-auto bg-slate-50/50 p-0` (removed `p-10`).

## 4. Rebuilt `app/page.tsx` (Implementation Blueprint)
```typescript
"use client";
import { useState } from "react";
// ... imports

export default function Dashboard() {
  const [flashMode, setFlashMode] = useState<'' | 'pipedrive' | 'rosewood'>('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Zone A: Top Bar (API Key + Flash Dropdown)
  // Zone B: Context Banner (Active when flashMode === 'pipedrive')
  // Zone C: Card Grid (Mapped from CRMArchitectureBlueprint)
  // Zone D: Modals (Inspection & Automation)

  return (
    <div className="flex flex-col h-screen">
      {/* Dynamic Header */}
      {/* Contextual Flash Banner */}
      <div className="p-6 overflow-auto">
        {/* Render Cards or List based on 'view' */}
      </div>
      {/* Modal Layers */}
    </div>
  );
}
```

## 5. Data Flow
The SPA will use `types/blueprint.ts` as the source of truth for all image interactions. The `API JSON` tab in the detail modal will allow direct editing of the `CRMArchitectureBlueprint` structure, mirroring the "High-Velocity" layout philosophy.

---
*Note: pipedrive_image_manager_poc.html was not found in the workspace; prompt.txt was used as the primary design reference.*
