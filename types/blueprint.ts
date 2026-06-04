export interface PipedriveCapabilitiesRegistry {
  meta: {
    version: string;
    engine: string;
    planRequirement: string;
    governanceLimits: {
      maxDelayDays: number;
      maxMonitoredFieldsPerUpdateTrigger: number;
      historicalLogRetentionDays: number;
      delayedExecutionLogExtensionDays: string;
    };
  };
  triggers: {
    eventBased: {
      scope: string;
      events: string[];
      subOptionsMonitoredFields: string[];
    }[];
    dateBased: {
      scope: string;
      supportedDateFields: string[];
      operators: string[];
      timeOffsets: { allowHours: boolean; allowDays: boolean };
    }[];
  };
  conditionOperators: {
    active: { id: string; label: string; description: string }[];
    passive: { id: string; label: string }[];
  };
  controlFlow: { id: string; type: string; behavior: string }[];
  nativeInternalActions: Record<string, { action: string; parameters?: string[]; description?: string; allowedOutputs?: string[] }[]>;
  supportedIntegrations: Record<string, { id: string; actions: { id: string; subOptions?: string[] }[] }>;
}

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

export interface PipedriveLegoAutomationBlock {
  automationNumber: string; // e.g., "1.1.1" or "G.0.1"
  name: string;
  description: string;
  trigger: { 
    scope: 'deal' | 'lead' | 'activity' | 'person' | 'organization' | 'project' | 'task'; 
    event: 'added' | 'updated' | 'deleted' 
  };
  conditions: { field: string; operator: string; value: string }[];
  actions: { 
    type: string; 
    scope: string; 
    mutations: { field_key: string; value: string }[] 
  }[];
  governanceNotes: string;
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
  // The Declarative Automation Ledger
  legoAutomations?: PipedriveLegoAutomationBlock[];
}

