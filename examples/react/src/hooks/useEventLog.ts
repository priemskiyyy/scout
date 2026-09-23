import { useSyncExternalStore } from "react";

import type { EventLog } from "examples/shared/outpost/types/EventLog";

export const useEventLog = <T>(log: EventLog<T>) =>
  useSyncExternalStore(log.subscribe, log.getSnapshot, log.getSnapshot);
