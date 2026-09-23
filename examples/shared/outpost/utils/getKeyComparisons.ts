import type { OutpostRuntime } from "examples/shared/outpost/types/OutpostRuntime";
import type { KeyComparison } from "examples/shared/outpost/types/KeyComparison";

/**
 * Pairs of searches written two ways, keyed by the real builders, so the
 * page shows what Scout decides rather than what it is said to decide.
 *
 * @example
 * ```ts
 * getKeyComparisons(runtime)[0].left.key; // ["scout", ...]
 * ```
 */
export const getKeyComparisons = (runtime: OutpostRuntime): KeyComparison[] => {
  const { api, orama } = runtime.indexes;

  return [
    {
      title: "Two where calls, or one and",
      explanation:
        "Repeated where calls combine with and, and the filter is normalised, so both are the same search.",
      left: {
        code: 'search("tent")\n  .where((p, { and }) =>\n    and(p.inStock.eq(true), p.price.lt(300)))',
        key: api
          .search("tent")
          .where((product, { and }) =>
            and(product.inStock.eq(true), product.price.lt(300)),
          )
          .key(),
      },
      right: {
        code: 'search("tent")\n  .where((p) => p.inStock.eq(true))\n  .where((p) => p.price.lt(300))',
        key: api
          .search("tent")
          .where((product) => product.inStock.eq(true))
          .where((product) => product.price.lt(300))
          .key(),
      },
    },
    {
      title: "A set in any order",
      explanation:
        "A set's values are sorted and deduplicated, so the order you pick brands in does not split the cache.",
      left: {
        code: 'search("tent")\n  .where((p) => p.brand.in(["Tern", "Halden"]))',
        key: api
          .search("tent")
          .where((product) => product.brand.in(["Tern", "Halden"]))
          .key(),
      },
      right: {
        code: 'search("tent")\n  .where((p) =>\n    p.brand.in(["Halden", "Tern", "Tern"]))',
        key: api
          .search("tent")
          .where((product) => product.brand.in(["Halden", "Tern", "Tern"]))
          .key(),
      },
    },
    {
      title: "The same search on two engines",
      explanation:
        "The adapter's fingerprint is part of the key, so one engine's answer is never served for another's.",
      left: {
        code: 'scout.index("api").search("tent")',
        key: api.search("tent").key(),
      },
      right: {
        code: 'scout.index("orama").search("tent")',
        key: orama.search("tent").key(),
      },
    },
  ];
};
