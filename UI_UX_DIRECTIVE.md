Rosewood Engine UI/UX Directive: "NewOS Minimal Stark" Aesthetic
This system documentation outlines the interface architecture for the Rosewood workspace components. All visual updates and functional elements must strictly adhere to these guidelines to ensure consistency across active screens.

1. Typography Hierarchy & Spacing Signatures
Font Stacks: Strictly Sans-Serif system fonts (Inter / System-UI). Never utilize decorative serif or variable width display fonts for telemetry readouts.

Title Constraints: Titles must use tracking-tight font-bold text-zinc-900 dark:text-zinc-100. Long title text strings must apply clean truncation logic (truncate) rather than shifting layout line heights down.

Metadata Blocks: Use a monospaced font family for version strings, timestamp indices, and code telemetry. Apply an extended character layout rule (tracking-widest uppercase text-[10px] font-mono text-zinc-500).

Content Row Separators: Completely remove alternating message blocks and bordered bubble parameters. Content elements must flow cleanly, separated by simple line rules (border-b border-zinc-200/60 dark:border-zinc-800/60 py-6).

2. Structural Component Grid Geometry
Header Toolbelt: The primary header interface is capped at a strict maximum height of h-14. It acts as a dense, utility-first toolbelt housing connectivity status indicators, global actions, and modal trigger overrides.

Dashboard Cards: To maintain structural visual consistency, cards are barred from scaling dynamically based on inner string lengths. Cards must apply a fixed, standard "stubby" aspect ratio (e.g., w-72 h-52) with small border radii (rounded or rounded-sm) and zero default background drop-shadows.

The Content Preview Canvas: Tabs displaying compiled instructions must render content as a true document view, replacing raw monospace data fields with a high-fidelity rendering layout featuring distinct visual hierarchy, color-coded pipeline headers, and clearly demarcated lists.

3. Element Token Palette
Primary Controls: Solid Pipedrive Deep Teal (#004850). Hover animations must use crisp, high-velocity translation scalings (active:scale-95 transition-all) instead of slow easing states.

Pipeline 1 Accent: Navy Tone #1B3A6B accompanied by fill background #D6E4F0.

Pipeline 2 Accent: Dark Green Tone #1B5E20 accompanied by fill background #D5F5E3.

Pipeline 3 Accent: Deep Purple Tone #4A148C accompanied by fill background #E8DAEF.

Pipeline 4 Accent: Deep Red Tone #922B21 accompanied by fill background #FADBD8.