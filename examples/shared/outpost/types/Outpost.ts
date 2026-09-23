import type { CatalogueBackend } from "examples/shared/outpost/types/CatalogueBackend";
import type { InPageEngines } from "examples/shared/outpost/types/InPageEngines";
import type { Timeline } from "examples/shared/outpost/types/Timeline";

/** What outlives a Scout: your API, the in-page engines and the timeline. */
export type Outpost = {
  backend: CatalogueBackend;
  engines: InPageEngines;
  timeline: Timeline;
};
