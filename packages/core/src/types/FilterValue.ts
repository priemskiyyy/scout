/**
 * A value a filter compares a field with. The typed builder only offers the
 * operators a field's schema type supports, so a string field never meets a
 * range.
 *
 * @example
 * ```ts
 * const value: FilterValue = "Acme";
 * ```
 *
 * @see [Filters](https://priemskiyyy.github.io/scout/filters.html)
 */
export type FilterValue = string | number | boolean;
