import type { SearchIndex } from "@priemskiyyy/scout";

import type { EngineId } from "examples/shared/outpost/types/EngineId";
import type { EventLog } from "examples/shared/outpost/types/EventLog";
import type { StoreShape } from "examples/shared/outpost/types/StoreShape";
import type { TimelineEntry } from "examples/shared/outpost/types/TimelineEntry";
import type { TimelineEvent } from "examples/shared/outpost/types/TimelineEvent";
import type { ValidationMode } from "examples/shared/outpost/types/ValidationMode";

/** One Scout over the four engines in the page, and what it has done. */
export type OutpostRuntime = {
  indexes: Readonly<Record<EngineId, SearchIndex<StoreShape>>>;
  validate: ValidationMode;
  timeline: EventLog<TimelineEntry>;
  record: (event: TimelineEvent) => void;
  dispose: () => void;
};
