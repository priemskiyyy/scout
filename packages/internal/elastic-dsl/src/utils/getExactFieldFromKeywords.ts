/**
 * The field that holds a field's exact value: the one `keywords` names for
 * it, or the field itself.
 *
 * @example
 * ```ts
 * getExactFieldFromKeywords("brand", { brand: "brand.keyword" }); // "brand.keyword"
 * ```
 */
export const getExactFieldFromKeywords = (
  field: string,
  keywords: Readonly<Record<string, string>>,
): string => {
  // Own keys only, so a field named like an `Object` method stays itself.
  if (!Object.hasOwn(keywords, field)) {
    return field;
  }

  return keywords[field] ?? field;
};
