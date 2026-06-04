import capabilitiesData from "./pipedriveCapabilities.json";
import { PipedriveCapabilitiesRegistry } from "@/types/blueprint";

// Cast to the registry type for type safety
export const PIPEDRIVE_CAPABILITIES_REGISTRY: PipedriveCapabilitiesRegistry = capabilitiesData;
