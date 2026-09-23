/**
 * The bounds of one `range` query on a number field.
 *
 * @example
 * ```ts
 * const cheap: ElasticRange = { lte: 200 };
 * ```
 */
export type ElasticRange = {
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
};
