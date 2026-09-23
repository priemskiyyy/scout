import { formatDuration } from "examples/shared/outpost/formatting/formatDuration";
import { formatTotal } from "examples/shared/outpost/formatting/formatTotal";
import type { TimelineDescription } from "examples/shared/outpost/types/TimelineDescription";
import type { TimelineEntry } from "examples/shared/outpost/types/TimelineEntry";
import type { ValidationMode } from "examples/shared/outpost/types/ValidationMode";
import { assertUnreachable } from "examples/shared/outpost/utils/assertUnreachable";
import { ENGINE_GUIDES } from "examples/shared/outpost/constants/engines";

const VALIDATION_WORDS: Record<ValidationMode, string> = {
  error: "an invalid document failing its search",
  skip: "invalid documents skipped and counted",
};

/**
 * One timeline entry in words, with where it came from and how it went.
 *
 * @example
 * ```ts
 * describeTimelineEntry(entry); // { source: "Your API", text: 'Answered "tent": 7 results in 402 ms', tone: "positive" }
 * ```
 */
export const describeTimelineEntry = (
  entry: TimelineEntry,
): TimelineDescription => {
  if (entry.kind === "sent") {
    return {
      source: ENGINE_GUIDES[entry.engine].name,
      text: `Received ${JSON.stringify(entry.query)}`,
      tone: "info",
    };
  }

  if (entry.kind === "answered") {
    return {
      source: ENGINE_GUIDES[entry.engine].name,
      text: `Answered ${JSON.stringify(entry.query)}: ${formatTotal(entry.total)} in ${formatDuration(entry.duration)}`,
      tone: "positive",
    };
  }

  if (entry.kind === "orphaned") {
    return {
      source: ENGINE_GUIDES[entry.engine].name,
      text: `Answered ${JSON.stringify(entry.query)} ${formatDuration(entry.duration)} in, after its caller had already gone`,
      tone: "warning",
    };
  }

  if (entry.kind === "refused") {
    return {
      source: ENGINE_GUIDES[entry.engine].name,
      text: `Refused ${JSON.stringify(entry.query)}: ${entry.message}`,
      tone: "warning",
    };
  }

  if (entry.kind === "failed") {
    return {
      source: ENGINE_GUIDES[entry.engine].name,
      text: `Failed ${JSON.stringify(entry.query)}: ${entry.message}`,
      tone: "danger",
    };
  }

  if (entry.kind === "aborted") {
    return {
      source: ENGINE_GUIDES[entry.engine].name,
      text: `Stopped working on ${JSON.stringify(entry.query)}: the search was aborted`,
      tone: "neutral",
    };
  }

  if (entry.kind === "answered-by-scout") {
    return {
      source: "Scout",
      text: `Answered ${JSON.stringify(entry.query)} itself: the filter matches nothing, so ${ENGINE_GUIDES[entry.engine].name} was never asked`,
      tone: "accent",
    };
  }

  if (entry.kind === "engine-selected") {
    return {
      source: "Store",
      text: `Searching ${ENGINE_GUIDES[entry.engine].name} now`,
      tone: "neutral",
    };
  }

  if (entry.kind === "disposed") {
    return {
      source: "Scout",
      text: "Disposed: everything in flight settled, and new searches are refused",
      tone: "neutral",
    };
  }

  if (entry.kind === "restarted") {
    return {
      source: "Scout",
      text: `Started again, with ${VALIDATION_WORDS[entry.validate]}`,
      tone: "positive",
    };
  }

  return assertUnreachable(entry);
};
