import type { SearchTotal } from "@priemskiyyy/scout";

import type { ElasticSearchResponseBody } from "src/types/ElasticSearchResponseBody";
import { isPartialResponse } from "src/utils/isPartialResponse";

const getAccuracy = (
  body: ElasticSearchResponseBody,
  relation: "eq" | "gte",
): "exact" | "lower-bound" => {
  if (isPartialResponse(body)) {
    return "lower-bound";
  }

  // The engine stops counting at `track_total_hits`, 10,000 by default.
  if (relation === "gte") {
    return "lower-bound";
  }

  return "exact";
};

/**
 * How many documents matched, and how sure the engine is. The count covers
 * every match, while paging ends at `max_result_window`, which the adapter
 * reports as `retrievable`.
 *
 * @example
 * ```ts
 * getTotalEntriesCountFromResponse(body); // { value: 10000, accuracy: "lower-bound", scope: "matches" }
 * ```
 */
export const getTotalEntriesCountFromResponse = (
  body: ElasticSearchResponseBody,
): SearchTotal => {
  const { total } = body.hits;

  // `track_total_hits: false` leaves the count out, and Scout never sends it.
  if (total === undefined) {
    return { accuracy: "unknown", scope: "matches" };
  }

  // `rest_total_hits_as_int` answers with a bare number, which the engine
  // only allows for a count it tracked exactly.
  if (typeof total === "number") {
    return {
      value: total,
      accuracy: getAccuracy(body, "eq"),
      scope: "matches",
    };
  }

  return {
    value: total.value,
    accuracy: getAccuracy(body, total.relation),
    scope: "matches",
  };
};
