/**
 * One highlighted field on a hit, in the flat `highlights` form.
 *
 * @example
 * ```ts
 * const highlight: TypesenseHighlight = { field: "name", snippet: "Running <mark>shoe</mark>" };
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseHighlight = {
  /** `keyof TDocument` in the SDK, so it widens the same way `field_name` does. */
  readonly field: PropertyKey;
  readonly snippet?: string;
  readonly value?: string;
  readonly snippets?: readonly string[];
  readonly indices?: readonly number[];
};
