/**
 * The body a backend answers for a search it cannot serve. Scout rejects the
 * search with a `ScoutError` whose code is `unsupported-feature` and whose
 * message is the backend's.
 *
 * @example
 * ```ts
 * const body: ScoutWireRefusal = { refusal: { message: "Facets on price are not supported." } };
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type ScoutWireRefusal = {
  refusal: { message: string };
};
