import type { TimelineEvent } from "examples/shared/outpost/types/TimelineEvent";

export type TimelineEntry = TimelineEvent & { id: number; at: number };
