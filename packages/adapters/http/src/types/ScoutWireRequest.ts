import type { FilterExpression } from "@priemskiyyy/scout";

/**
 * The body `scoutWireRequest` sends: Scout's own request, written out field by
 * field so the format stays what the README documents even if the contract
 * grows one. `filter` is the normalised filter AST verbatim, which is already
 * JSON, and `provider` is whatever a `.provider()` call passed.
 *
 * @example
 * ```ts
 * const body: ScoutWireRequest = scoutWireRequest(request);
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type ScoutWireRequest = {
  index: string;
  query: string;
  profile: string;
  sort: string;
  filter: FilterExpression;
  facets: readonly string[];
  highlights: readonly string[];
  readonly page: { readonly current: number; readonly size: number };
  provider: unknown;
};
