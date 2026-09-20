/**
 * A document as Algolia stores it, before Scout validates it.
 *
 * @example
 * ```ts
 * const document: AlgoliaDocument = { objectID: "p1", name: "Headphones" };
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaDocument = Readonly<Record<string, unknown>>;
