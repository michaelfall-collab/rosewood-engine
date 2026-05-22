// src/types/blueprint.ts

export interface PipelineStageSpec {
  name: string;
  order_nr: number;
  deal_probability: number;
  rotten_flag: boolean;
  rotten_days: number | null;
}

export interface PipelineSpec {
  name: string;
  order_nr: number;
  deal_probability: boolean;
  stages: PipelineStageSpec[];
}

export interface CRMArchitectureBlueprint {
  id: string;
  version: string;
  name: string;
  description: string;
  pipelines: PipelineSpec[];
  // Future drops: customFields, activityTypes, lostReasons go here
}