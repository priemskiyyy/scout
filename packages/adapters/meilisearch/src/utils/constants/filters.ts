export const RANGE_SYMBOLS: Readonly<
  Record<"gt" | "gte" | "lt" | "lte", string>
> = {
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
};

/**
 * A field name Meilisearch reads as one attribute. Anything else would end
 * the attribute and start a new clause, so it is refused rather than escaped.
 */
export const FIELD_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
