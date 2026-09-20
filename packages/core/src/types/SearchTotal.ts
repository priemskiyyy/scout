import type { SearchTotalScope } from "src/types/SearchTotalScope";

/**
 * How many documents matched, and how much the engine is guessing.
 *
 * `"estimated"` is Algolia's `exhaustive.nbHits: false` and Typesense's
 * `search_cutoff: true`. `"lower-bound"` is a capped count such as
 * Meilisearch's `maxTotalHits`. `"unknown"` is an engine that reported nothing.
 * Scout never fabricates a count or a page total.
 *
 * @example
 * ```ts
 * if (result.total.accuracy === "unknown") return "Many results";
 * return `${result.total.accuracy === "exact" ? "" : "About "}${result.total.value}`;
 * ```
 */
export type SearchTotal =
  | {
      readonly value: number;
      readonly accuracy: "exact" | "estimated" | "lower-bound";
      readonly scope: SearchTotalScope;
    }
  | {
      readonly accuracy: "unknown";
      readonly scope: SearchTotalScope | "unknown";
    };
