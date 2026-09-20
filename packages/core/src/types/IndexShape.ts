/**
 * Carries an index's document, portable field names and native types through
 * the builder and result types.
 *
 * @example
 * ```ts
 * type ProductShape = IndexShape & {
 *   document: Product; filterable: "brand" | "price"; facetable: "brand";
 *   highlightable: "name"; sort: "relevance"; profile: "default";
 * };
 * ```
 *
 * @see [IndexDeclaration usage](https://priemskiyyy.github.io/scout/indexes.html)
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
