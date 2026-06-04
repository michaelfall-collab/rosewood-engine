import { CRMArchitectureBlueprint } from "@/types/blueprint";

export const ROSEWOOD_ENGINE_PROPRIETARY_EXPORT_TYPE = "ROSEWOOD_ENGINE_PROPRIETARY_EXPORT";

export const serializeToRwe = (
  blueprint: CRMArchitectureBlueprint,
  abCompiledObjects: any[]
): string => {
  const preparedBlueprint: any = {
    ...blueprint,
    // Maintain strict state fallbacks
    lifecycleState: blueprint.lifecycleState || 'PRESCRIPTIVE_BUILD', 
    pipelines: (blueprint.pipelines || []).map((pipeline, pIdx) => ({
      ...pipeline,
      order_nr: pipeline.order_nr ?? pIdx + 1,
      stages: (pipeline.stages || []).map((stage, sIdx) => ({
        ...stage,
        order_nr: stage.order_nr ?? sIdx + 1,
        operational_telemetry: (stage as any).operational_telemetry || {
          targetDirective: "",
          stuckThreshold: "",
          routingDropdownKey: "",
          isRecurringLoop: false,
          recurrenceDays: 7
        }
      }))
    })),
    legoAutomations: blueprint.legoAutomations || []
  };

  // Dual-Key Serialization: Writes both systems simultaneously to protect backward-compatibility
  const payload: any = {
    type: ROSEWOOD_ENGINE_PROPRIETARY_EXPORT_TYPE,
    ...preparedBlueprint,
    blueprint: preparedBlueprint, 
    compiledRunbook: abCompiledObjects || [],
    abCompiledObjects: abCompiledObjects || [],
    version: "1.1.0", // Bumped version for LEGO blocks
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(payload, null, 2);
};

export const deserializeFromRwe = (jsonString: string): any => {
  const parsed = JSON.parse(jsonString);
  if (parsed.type !== ROSEWOOD_ENGINE_PROPRIETARY_EXPORT_TYPE) {
    throw new Error("Invalid file signature");
  }

  // Polymorphic Bridge: Extract parameters from root if flat, or sub-object if nested wrapped
  const baseBlueprint = parsed.blueprint ? parsed.blueprint : { ...parsed };
  const runbookPayload = parsed.compiledRunbook || parsed.abCompiledObjects || [];

  return {
    blueprint: baseBlueprint,
    compiledRunbook: runbookPayload,
    abCompiledObjects: runbookPayload,
    selectedIntegrations: parsed.selectedIntegrations || baseBlueprint.selectedIntegrations || []
  };
};
