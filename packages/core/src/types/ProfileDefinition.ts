/**
 * One named search profile: the fields its query text runs against.
 *
 * @example
 * ```ts
 * const autocomplete: ProfileDefinition<"name"> = { searchable: ["name"] };
 * ```
 *
 * @see [Profiles and sorts](https://priemskiyyy.github.io/scout/profiles-and-sorts.html)
 */
export type ProfileDefinition<TField extends string> = {
  readonly searchable: readonly [TField, ...TField[]];
};
