/**
 * One operator Orama accepts against a single property.
 *
 * @example
 * ```ts
 * const condition: OramaFieldCondition = { between: [50, 200] };
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaFieldCondition =
  | boolean
  | { readonly eq: string | number | boolean }
  | { readonly gt: number }
  | { readonly gte: number }
  | { readonly lt: number }
  | { readonly lte: number }
  | { readonly between: readonly [number, number] };
