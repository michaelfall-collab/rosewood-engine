# Rosewood Engine UI/UX Directive: "Cockpit SPA" Aesthetic
This directive outlines the interface architecture for the Rosewood SPA "Cockpit" dashboard. All visual updates and functional elements must strictly adhere to these guidelines to ensure consistency.

## 1. Architectural Philosophy
The Rosewood Engine operates as a Single-Page Application (SPA) dashboard ("The Cockpit"). We have moved away from multi-page routing to a modal-first, state-driven interface.

## 2. Typography & Spacing
- **Font Stack:** Strictly Sans-Serif system fonts (Inter / System-UI).
- **Titles:** `font-bold tracking-tight text-zinc-900 dark:text-zinc-100`. Use truncation (`truncate`) for long strings.
- **Telemetry:** Monospaced for version strings, timestamps, and code blocks (`tracking-widest uppercase text-[10px] font-mono`).

## 3. Structural Component Geometry
- **Header Toolbelt:** Capped at `h-14`. Houses connectivity status, global actions, and modal trigger overrides.
- **Dashboard Cards:** Fixed aspect ratio (`w-72 h-52`) to ensure grid consistency. No drop-shadows. `rounded-sm`.
- **Modals:** The primary mechanism for focused operations (Automation Builder, Detail View). These must be full-screen, backdrop-blurred overlays (`bg-zinc-950/60 backdrop-blur-sm`).

## 4. Interaction Patterns
- **Loading State:** Critical operations (serialization/deserialization) must trigger a global `isProcessing` spinner to prevent UI freezing during heavy tasks.
- **Feedback:** Use transient toast-like feedback indicators for action confirmation.
- **Modal-First Workflows:** Configuration, detail inspection, and automation building happen inside modal contexts, keeping the "Cockpit" dashboard as the persistent orchestrator.

## 5. Token Palette
- **Primary:** Deep Teal (`#004850`).
- **Accent:** Consistent with the Pipedrive/CRM ecosystem (muted neutrals and high-contrast alert colors).
- **Transitions:** Crisp, high-velocity translation scalings (`active:scale-95 transition-all`). Avoid slow easing.
