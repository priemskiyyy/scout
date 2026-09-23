import type { ScoutErrorCode, SearchTotal } from "@priemskiyyy/scout";

import type { FacetCountsNote } from "examples/shared/outpost/types/FacetCountsNote";
import type { RequestOutcome } from "examples/shared/outpost/types/RequestOutcome";
import type { SearchProblemCode } from "examples/shared/outpost/types/SearchProblemCode";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { Tone } from "examples/shared/ui/types/Tone";
import type { Translation } from "examples/shared/outpost/types/Translation";

export const ACCURACY_TONES: Record<SearchTotal["accuracy"], Tone> = {
  exact: "positive",
  estimated: "warning",
  "lower-bound": "info",
  unknown: "neutral",
};

export const ERROR_TONES: Record<ScoutErrorCode, Tone> = {
  configuration: "danger",
  "unsupported-feature": "warning",
  validation: "danger",
  provider: "danger",
  aborted: "neutral",
  disposed: "neutral",
};

export const STATUS_TONES: Record<SearchStatus, Tone> = {
  searching: "info",
  answered: "positive",
  "answered-by-scout": "accent",
  configuration: "danger",
  "unsupported-feature": "warning",
  validation: "danger",
  provider: "danger",
  aborted: "neutral",
  disposed: "neutral",
};

export const REQUEST_TONES: Record<RequestOutcome, Tone> = {
  answered: "positive",
  refused: "warning",
  failed: "danger",
  aborted: "neutral",
  orphaned: "warning",
};

export const FACET_NOTE_TONES: Record<FacetCountsNote, Tone> = {
  counted: "positive",
  sampled: "warning",
  unsaid: "neutral",
  off: "neutral",
  none: "neutral",
};

export const TRANSLATION_TONES: Record<Translation["kind"], Tone> = {
  sent: "positive",
  refused: "warning",
  "answered-by-scout": "accent",
  failed: "danger",
};

export const PROBLEM_TONES: Record<SearchProblemCode, Tone> = {
  configuration: "danger",
  "unsupported-feature": "warning",
  validation: "danger",
  provider: "danger",
  aborted: "neutral",
  disposed: "neutral",
  unexpected: "danger",
};
