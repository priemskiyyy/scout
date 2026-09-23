import type { FacetCounting } from "examples/shared/outpost/types/FacetCounting";
import type { PagingReach } from "examples/shared/outpost/types/PagingReach";
import type { TotalCounting } from "examples/shared/outpost/types/TotalCounting";

/** Everything the lab can change about your API. */
export type BackendState = {
  latency: number;
  counting: TotalCounting;
  facetCounting: FacetCounting;
  paging: PagingReach;
  offline: boolean;
  refuseHighlights: boolean;
  corruptDocument: boolean;
  hostileDocument: boolean;
  ignoreAborts: boolean;
};
