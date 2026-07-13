// Shapes mirrored from the plan picker's saved state (localStorage key "rw-build-studio").
// Kept loose on purpose — the picker owns the full schema; the cockpit only reads what it needs.

export interface PickerStage {
  name: string;
}

export interface PickerPipeline {
  name: string;
  /** undefined = a normal deal pipeline (pushable). "inbox" | "projects" = separate Pipedrive
   *  objects that are NOT deal pipelines and are handled via the runbook, not the API push. */
  kind?: "inbox" | "projects" | string;
  stages: PickerStage[];
}

export interface PickerPackage {
  name: string;
  noAutos?: boolean;
  pipelines?: PickerPipeline[];
}

export interface PickerClient {
  id: string;
  name: string;
  company?: string;
  finalized?: boolean;
  pkg?: PickerPackage | null;
}

export interface StudioState {
  clients?: PickerClient[];
}

/** What the deploy API accepts — the minimal, vendor-shaped contract. */
export interface PushPipeline {
  name: string;
  stages: string[];
}

export interface DeployResult {
  success: boolean;
  logs: string[];
  created?: { pipeline: string; id: number; stages: string[] }[];
}
