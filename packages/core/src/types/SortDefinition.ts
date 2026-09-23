import type { SortDirection } from "src/types/SortDirection";

/**
 * One named sort: the fields it orders by, in priority order, each with its
 * direction. `{ rating: "desc", price: "asc" }` sorts by rating and breaks ties
 * by price.
 *
 * @example
 * ```ts
 * const cheapestFirst: SortDefinition<Product> = { price: "asc" };
 * ```
 *
 * @see [Profiles and sorts](https://priemskiyyy.github.io/scout/profiles-and-sorts.html)
 */
export type SortDefinition<TDocument> = {
  readonly [TField in keyof TDocument & string]?: SortDirection;
};
