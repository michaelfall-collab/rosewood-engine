import { serializeToRwe, deserializeFromRwe, ROSEWOOD_ENGINE_PROPRIETARY_EXPORT_TYPE } from './fileSerializer';
import { CRMArchitectureBlueprint } from "@/types/blueprint";
import { describe, it, expect } from 'vitest';

describe('fileSerializer', () => {
  const mockBlueprint: CRMArchitectureBlueprint = {
    id: "test",
    version: "1.0.0",
    name: "Test Blueprint",
    description: "Test",
    lifecycleState: 'PRESCRIPTIVE_BUILD',
    pipelines: []
  };
  const mockCompiledObjects = [{ test: 'data' }];

  it('should serialize and deserialize correctly', () => {
    const rweString = serializeToRwe(mockBlueprint, mockCompiledObjects);
    const parsed = deserializeFromRwe(rweString);
    
    expect(parsed.blueprint).toEqual(mockBlueprint);
    expect(parsed.abCompiledObjects).toEqual(mockCompiledObjects);
  });

  it('should throw error on invalid signature', () => {
    const invalidJson = JSON.stringify({ type: 'INVALID', blueprint: {}, abCompiledObjects: [] });
    expect(() => deserializeFromRwe(invalidJson)).toThrow("Invalid file signature");
  });
});
