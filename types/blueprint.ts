// types/blueprint.ts

export interface StageOperationalContext {
  targetDirective?: string; // Unified human objective + desired outcome
  stuckThreshold?: string;
  routingDropdownKey?: string;
  isRecurringLoop?: boolean;
  recurrenceDays?: number;
}

export interface AutomationBlock {
  automationNumber: string;
  stageName: string;
  operationalGoal: string;
  impactedRoles: string[];
  setupSteps: string[];
  governanceNotes: string;
  pipelineId?: number | "GLOBAL";
  stageId?: number | "GLOBAL";
}

export interface PipelineStageSpec {
  name: string;
  order_nr: number;
  deal_probability: number;
  rotten_flag: boolean;
  rotten_days: number | null;
  operational_telemetry?: StageOperationalContext;
}

export interface PipelineSpec {
  name: string;
  order_nr: number;
  deal_probability: boolean;
  stages: PipelineStageSpec[];
}

export interface CustomFieldOption {
  label: string;
}

export interface CustomFieldSpec {
  key: string; // Sanitized identifier, e.g., 'cf_shed_style'
  name: string; // Exact user-facing display label
  type: 'text' | 'varchar' | 'double' | 'monetary' | 'date' | 'enum' | 'set' | 'user' | 'org' | 'people' | 'phone' | 'time' | 'timerange' | 'daterange' | 'address';
  field_type: 'deal' | 'person' | 'organization' | 'product';
  options?: CustomFieldOption[];
}

export interface ActivityTypeSpec {
  name: string;
  icon_key: string;
  color?: string;
  is_custom: boolean;
}

export interface LostReasonSpec {
  reason: string;
}

export interface SystemFieldMutationSpec {
  field_key: string; // e.g., 'label'
  field_type: 'deal' | 'person' | 'organization';
  custom_options: {
    label: string;
    color?: string;
  }[];
}

export interface CRMArchitectureBlueprint {
  id: string;
  version: string;
  name: string;
  description: string;
  // Formal definition identifier tracking the asset phase lifecycle status
  lifecycleState: 'PRESCRIPTIVE_BUILD' | 'PRODUCTION_AS_BUILT'; 
  pipelines: PipelineSpec[];
  customFields?: CustomFieldSpec[];
  activityTypes?: ActivityTypeSpec[];
  lostReasons?: LostReasonSpec[];
  systemFieldMutations?: SystemFieldMutationSpec[];
}
