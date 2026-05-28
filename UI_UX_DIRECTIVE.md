# Rosewood UI/UX Directive: "Professional-Hard" Pipedrive Aesthetic

To maintain visual and functional consistency with the Rosewood Engine's identity, all upcoming element builds must adhere to the following standards.

## 1. Visual Language & Ergonomics
- **Edges & Borders:** Transition from "soft/round" to "hard/professional". Use standard `rounded` (4px) or `rounded-sm` (2px) instead of large `rounded-xl/2xl`. 
- **Borders:** Use solid, high-contrast borders: `border-slate-300` (Light) and `border-slate-700` (Dark).
- **Color Palette:**
  - **Primary Action:** Pipedrive Teal `#004850` / `bg-[#004850]`.
  - **Success/Connected:** Emerald `text-emerald-600` / `bg-emerald-500/10`.
  - **Destructive/Disconnected:** Rose `text-rose-600` / `bg-rose-500/10`.
  - **Backgrounds:** Utilitarian Slate `bg-[#F1F5F9]` (Light) and Deep Navy `bg-[#0F172A]` (Dark).

## 2. Component Design
- **Header Bar:** Must feel like a toolbelt. High-density, h-14 maximum height. White backgrounds in light mode, high-density slate in dark.
- **Cards:** No box-shadows by default. Use borders and background color changes for hover states. Title text should be `font-bold` and `truncate`.
- **Modals:** Viewports should be expansive (w-full max-w-5xl). Tabs must use `font-bold uppercase tracking-wider` with a bottom-border indicator in Pipedrive Teal.
- **Typography:** Strictly Sans-Serif (Inter/System). Use `tracking-tight` for titles and `tracking-widest` for monospace metadata/versioning strings.

## 3. Interaction & Feedback
- **States:** Every action must have a `disabled` state during processing.
- **Spinners:** Use the standard teal ring spinner. Do not use complex lottie animations or skeletal loaders; prefer instantaneous state transitions.
- **Modals:** Use `zoom-in-95` and `fade-in` transitions with a duration of 200ms for a snappy, high-velocity feel.
- **Clipboard:** Always provide a brief (3s) confirmation feedback label: "✓ Copied to Clipboard".

## 4. Connectivity Indicators
- **Connected State:** Pulsing green dot with "Connected" label. Grouped inside a bordered node with the API input.
- **Action Triggers:** Use `active:scale-95` on buttons to provide tactile feedback on click.
