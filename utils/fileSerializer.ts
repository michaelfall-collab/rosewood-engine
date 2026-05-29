import { CRMArchitectureBlueprint } from "@/types/blueprint";

export const ROSEWOOD_ENGINE_PROPRIETARY_EXPORT_TYPE = "ROSEWOOD_ENGINE_PROPRIETARY_EXPORT";

interface ProprietaryExport {
  type: typeof ROSEWOOD_ENGINE_PROPRIETARY_EXPORT_TYPE;
  blueprint: CRMArchitectureBlueprint;
  abCompiledObjects: any[]; // Data matrix
  version: string;
  timestamp: string;
}

export const serializeToRwe = (
  blueprint: CRMArchitectureBlueprint,
  abCompiledObjects: any[]
): string => {
  const payload: ProprietaryExport = {
    type: ROSEWOOD_ENGINE_PROPRIETARY_EXPORT_TYPE,
    blueprint,
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
