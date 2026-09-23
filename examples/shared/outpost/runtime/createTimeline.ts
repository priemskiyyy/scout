import type { Timeline } from "examples/shared/outpost/types/Timeline";
import type { TimelineEntry } from "examples/shared/outpost/types/TimelineEntry";
import { createEventLog } from "examples/shared/outpost/utils/createEventLog";

/** The page's timeline. It outlives every Scout, so a restart shows up in it. */
export const createTimeline = (): Timeline => {
  const { log, add } = createEventLog<TimelineEntry>(80);
  let nextId = 1;

  return {
    log,
    record: (event) => {
      add({ ...event, id: nextId, at: Date.now() });
      nextId += 1;
    },
  };
};
