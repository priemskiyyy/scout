import type { OramaFieldCondition } from "src/types/OramaFieldCondition";

/**
 * Orama's `where`. It is a tree rather than a flat object: `and`, `or` and
 * `not` each take over the object they appear in, and any other object is read
 * as a map of property conditions combined with AND.
 *
 * @example
 * ```ts
 * const where: OramaWhere = { and: [{ price: { lte: 200 } }, { inStock: true }] };
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaWhere =
  | { readonly and: readonly OramaWhere[] }
  | { readonly or: readonly OramaWhere[] }
  | { readonly not: OramaWhere }
  | Readonly<Record<string, OramaFieldCondition>>;
