import type { EventLog } from "examples/shared/outpost/types/EventLog";
import type { TimelineEntry } from "examples/shared/outpost/types/TimelineEntry";
import type { TimelineEvent } from "examples/shared/outpost/types/TimelineEvent";

export type Timeline = {
  log: EventLog<TimelineEntry>;
  record: (event: TimelineEvent) => void;
};
