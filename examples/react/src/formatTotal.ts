import { assertUnreachable } from "@priemskiyyy/scout";
import type { SearchTotal } from "@priemskiyyy/scout";

/**
 * Renders a total without claiming more than the engine did.
 *
 * An estimate is labelled as one, a capped count keeps its `+`, and an engine
 * that reported nothing gets no number at all rather than a zero. All local
 * engines here count every match and report `"exact"`, so the other three
 * branches are what this application would render against Algolia, Typesense
 * or Meilisearch without a single component changing.
 */
export const formatTotal = (total: SearchTotal): string => {
  if (total.accuracy === "unknown") {
    return "An unknown number of results";
  }
  const count = total.value.toLocaleString("en-US");
  if (total.accuracy === "exact") {
    return `${count} ${total.value === 1 ? "result" : "results"}`;
  }
  if (total.accuracy === "estimated") {
    return `About ${count} results`;
  }
  if (total.accuracy === "lower-bound") {
    return `${count}+ results`;
  }
  return assertUnreachable(total.accuracy);
};
