import type { IndexDeclaration } from "src/types/IndexDeclaration";

/**
 * What the suite needs to know about the corpus behind the adapter.
 *
 * @example
 * ```ts
 * const fixtures: SearchAdapterConformanceFixtures<typeof products> = {
 *   query: "shoe",
 *   equality: { field: "brand", value: "Acme" },
 *   range: { field: "price", min: 10, max: 100 },
 * };
 * ```
 *
 * @see [Testing an adapter](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type SearchAdapterConformanceFixtures<
  TIndex extends IndexDeclaration = IndexDeclaration,
> = {
  /** Text that matches at least two documents. */
  query: string;
  /** A filterable string field and a value that some, but not all, documents hold. */
  equality: { field: TIndex["filterable"][number]; value: string };
  /** A filterable number field and a range that some, but not all, documents fall inside. */
  range?: { field: TIndex["filterable"][number]; min: number; max: number };
};
