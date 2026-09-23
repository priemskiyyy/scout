import type { SearchTotal } from "@priemskiyyy/scout";

import type { EngineId } from "examples/shared/outpost/types/EngineId";
import type { ValidationMode } from "examples/shared/outpost/types/ValidationMode";

/** Something that happened to a search, or to the Scout running them. */
export type TimelineEvent =
  | { kind: "sent"; engine: EngineId; query: string }
  | {
      kind: "answered";
      engine: EngineId;
      query: string;
      duration: number;
      total: SearchTotal;
    }
  | { kind: "orphaned"; engine: EngineId; query: string; duration: number }
  | { kind: "refused"; engine: EngineId; query: string; message: string }
  | { kind: "failed"; engine: EngineId; query: string; message: string }
  | { kind: "aborted"; engine: EngineId; query: string }
  | { kind: "answered-by-scout"; engine: EngineId; query: string }
  | { kind: "engine-selected"; engine: EngineId }
  | { kind: "disposed" }
  | { kind: "restarted"; validate: ValidationMode };
