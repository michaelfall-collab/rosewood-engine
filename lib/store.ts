import type { StudioState, PickerClient } from "@/lib/types";

/**
 * Data-layer abstraction. v1 is backed by the plan picker's localStorage; swapping to a hosted
 * DB later (team-shared builds) means reimplementing only this module — callers don't change.
 */
const STORAGE_KEY = "rw-build-studio";

export function loadStudioState(): StudioState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StudioState) : null;
  } catch {
    return null;
  }
}

/** Clients that have a plan selected (a pkg with pipelines) — the ones worth deploying. */
export function loadDeployableClients(): PickerClient[] {
  const state = loadStudioState();
  if (!state?.clients) return [];
  return state.clients.filter((c) => c.pkg && (c.pkg.pipelines?.length ?? 0) > 0);
}
