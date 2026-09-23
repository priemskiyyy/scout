/**
 * Carries one index's document, portable names and native types through the
 * builder and result types. Scout assembles it from the index declaration and
 * the adapter serving it.
 *
 * @example
 * ```ts
 * type ProductShape = IndexShape & {
 *   document: Product; filterable: "brand" | "price"; facetable: "brand";
 *   highlightable: "name"; sort: "relevance" | "priceAsc"; profile: "default";
 * };
 * ```
 *
 * @see [Indexes](https://priemskiyyy.github.io/scout/indexes.html)
 */
export type IndexShape = {
  document: unknown;
  native: {
    client: unknown;
    options: unknown;
    hit: unknown;
    response: unknown;
  };
  filterable: string;
  facetable: string;
  highlightable: string;
  sort: string;
  profile: string;
};
