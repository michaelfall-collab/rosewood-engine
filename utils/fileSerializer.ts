import { CRMArchitectureBlueprint } from "@/types/blueprint";

export const ROSEWOOD_ENGINE_PROPRIETARY_EXPORT_TYPE = "ROSEWOOD_ENGINE_PROPRIETARY_EXPORT";

interface ProprietaryExport {
  type: typeof ROSEWOOD_ENGINE_PROPRIETARY_EXPORT_TYPE;
  blueprint: CRMArchitectureBlueprint;
  compiledRunbook: any[];
  abCompiledObjects: any[]; // Data matrix
  version: string;
  timestamp: string;
}

export const serializeToRwe = (
  blueprint: CRMArchitectureBlueprint,
  abCompiledObjects: any[]
): string => {
  // 1. Prepare blueprint: Fix order_nr and operational_telemetry, remove extra fields
  const preparedBlueprint: any = {
    ...blueprint,
    activityTypes: undefined,
    systemFieldMutations: undefined,
    pipelines: blueprint.pipelines.map((pipeline, pIdx) => ({
      ...pipeline,
      order_nr: pIdx + 1,
      stages: pipeline.stages.map((stage, sIdx) => ({
        ...stage,
        order_nr: sIdx + 1,
        operational_telemetry: (stage as any).operational_telemetry || {
          targetDirective: "",
          stuckThreshold: "",
          routingDropdownKey: "",
          isRecurringLoop: false,
          recurrenceDays: 7
        }
      }))
    }))
  };

  const payload: ProprietaryExport = {
    type: ROSEWOOD_ENGINE_PROPRIETARY_EXPORT_TYPE,
    blueprint: preparedBlueprint,
    compiledRunbook: abCompiledObjects,
    abCompiledObjects,
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(payload, null, 2);
};

export const deserializeFromRwe = (jsonString: string): ProprietaryExport => {
  const parsed = JSON.parse(jsonString);
  if (parsed.type !== ROSEWOOD_ENGINE_PROPRIETARY_EXPORT_TYPE) {
    throw new Error("Invalid file signature");
  }
  return parsed as ProprietaryExport;
};
