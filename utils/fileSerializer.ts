import { CRMArchitectureBlueprint } from "@/types/blueprint";

export const ROSEWOOD_ENGINE_PROPRIETARY_EXPORT_TYPE = "ROSEWOOD_ENGINE_PROPRIETARY_EXPORT";

export const serializeToRwe = (
  blueprint: CRMArchitectureBlueprint,
  abCompiledObjects: any[]
): string => {
  const payload = {
    type: ROSEWOOD_ENGINE_PROPRIETARY_EXPORT_TYPE,
    ...blueprint, // Injects all custom fields, lost reasons, pipelines, and activity types at root level
    abCompiledObjects: abCompiledObjects || [],
    compiledRunbook: abCompiledObjects || [],
    version: "1.0.0",
    timestamp: new Date().toISOString()
  };
  return JSON.stringify(payload, null, 2);
};

export const deserializeFromRwe = (jsonString: string): any => {
  const parsed = JSON.parse(jsonString);
  if (parsed.type !== ROSEWOOD_ENGINE_PROPRIETARY_EXPORT_TYPE) throw new Error("Invalid file signature");

  // Symmetrical Data Bridge: Normalize old nested formats or read root elements natively
  const targetBlueprint = parsed.blueprint ? parsed.blueprint : parsed;
  const runbookPayload = parsed.abCompiledObjects || parsed.compiledRunbook || [];

  return {
    ...targetBlueprint,
    abCompiledObjects: runbookPayload,
    compiledRunbook: runbookPayload,
    selectedIntegrations: parsed.selectedIntegrations || targetBlueprint.selectedIntegrations || []
  };
};
