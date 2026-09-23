/**
 * What a search asks to highlight, between markers made for that search.
 *
 * @example
 * ```ts
 * const highlight: ElasticHighlight = {
 *   pre_tags: [markers.open], post_tags: [markers.close],
 *   fields: { name: { number_of_fragments: 0 } },
 * };
 * ```
 */
export type ElasticHighlight = {
  pre_tags: string[];
  post_tags: string[];
  fields: Record<string, { number_of_fragments: number }>;
};
