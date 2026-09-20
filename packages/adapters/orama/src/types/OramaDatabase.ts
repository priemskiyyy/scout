/**
 * The part of an Orama database this adapter reads. The database itself is
 * injected, so this package imports no Orama code at runtime.
 *
 * The schema is read because Orama filters a property by its declared kind: a
 * `string` property is matched by token and an `enum`, `number` or `boolean`
 * property is matched by value. Only the second group can carry a portable
 * filter, and the adapter has to know which is which to say so.
 *
 * @example
 * ```ts
 * const database: OramaDatabase = create({ schema: { name: "string", brand: "enum" } });
 * ```
 * @see [orama adapter](https://priemskiyyy.github.io/scout/adapters.html#orama)
 */
export type OramaDatabase = {
  schema: Readonly<Record<string, unknown>>;
};
