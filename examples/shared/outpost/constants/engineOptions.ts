import type { EngineId } from "examples/shared/outpost/types/EngineId";
import type { Option } from "examples/shared/outpost/types/Option";
import {
  ENGINE_GUIDES,
  ENGINE_IDS,
} from "examples/shared/outpost/constants/engines";

export const ENGINE_OPTIONS: Option<EngineId>[] = ENGINE_IDS.map((engine) => ({
  value: engine,
  label: ENGINE_GUIDES[engine].name,
}));
