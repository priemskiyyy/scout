import type { ScoutErrorCode, SearchTotal } from "@priemskiyyy/scout";

import type { Category } from "examples/shared/outpost/types/Category";
import type { FacetCountsNote } from "examples/shared/outpost/types/FacetCountsNote";
import type { RequestOutcome } from "examples/shared/outpost/types/RequestOutcome";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { Translation } from "examples/shared/outpost/types/Translation";

export const CATEGORY_LABELS: Record<Category, string> = {
  tents: "Tents",
  sleeping: "Sleeping",
  packs: "Packs",
  footwear: "Footwear",
  jackets: "Jackets",
  cooking: "Cooking",
  lighting: "Lighting",
};

export const ACCURACY_LABELS: Record<SearchTotal["accuracy"], string> = {
  exact: "Exact",
  estimated: "Estimated",
  "lower-bound": "Lower bound",
  unknown: "Unknown",
};

export const ACCURACY_MEANINGS: Record<SearchTotal["accuracy"], string> = {
  exact: "Every match was counted.",
  estimated:
    "The engine stopped early and guessed. The real count can be higher or lower.",
  "lower-bound":
    "At least this many match. The engine stopped counting, not matching.",
  unknown: "The engine did not say how many match, so nothing is shown.",
};

export const ACCURACY_ORDER: SearchTotal["accuracy"][] = [
  "exact",
  "estimated",
  "lower-bound",
  "unknown",
];

export const ERROR_LABELS: Record<ScoutErrorCode, string> = {
  configuration: "Configuration",
  "unsupported-feature": "Unsupported feature",
  validation: "Validation",
  provider: "Provider",
  aborted: "Aborted",
  disposed: "Disposed",
};

export const ERROR_MEANINGS: Record<ScoutErrorCode, string> = {
  configuration:
    "The search cannot work as written, such as a page of zero. Nothing was sent.",
  "unsupported-feature":
    "The engine cannot do part of the search, so it refused rather than quietly narrowing it.",
  validation: "A document the engine returned failed the index's schema.",
  provider: "The engine or its client failed. The original error is the cause.",
  aborted: "The caller's signal aborted the search, which settled at once.",
  disposed: "The Scout was disposed before the search settled.",
};

export const ERROR_ORDER: ScoutErrorCode[] = [
  "unsupported-feature",
  "provider",
  "validation",
  "aborted",
  "disposed",
  "configuration",
];

export const STATUS_LABELS: Record<SearchStatus, string> = {
  searching: "Searching",
  answered: "Answered",
  "answered-by-scout": "Answered by Scout",
  configuration: "Misconfigured",
  "unsupported-feature": "Refused",
  validation: "Invalid document",
  provider: "Engine failed",
  aborted: "Aborted",
  disposed: "Disposed",
};

export const REQUEST_LABELS: Record<RequestOutcome, string> = {
  answered: "Answered",
  refused: "Refused",
  failed: "Failed",
  aborted: "Aborted",
  orphaned: "Answered, nobody listening",
};

export const FACET_NOTES: Record<FacetCountsNote, string> = {
  counted: "Counted over every match",
  sampled: "Counted over a sample: a dash is a value it did not reach",
  unsaid: "The engine did not say how it counted",
  off: "Counts are off, so no engine is asked for them",
  none: "No counts for this search",
};

export const TRANSLATION_LABELS: Record<Translation["kind"], string> = {
  sent: "Translated",
  refused: "Refused",
  "answered-by-scout": "Answered by Scout",
  failed: "Failed",
};
