/**
 * A run of text and whether it matched the query. Scout never returns markup,
 * so rendering cannot inject HTML from a document or from a query.
 *
 * @example
 * ```ts
 * parts.map((part) => (part.matched ? <mark>{part.text}</mark> : part.text));
 * ```
 */
export type HighlightPart = {
  readonly text: string;
  readonly matched: boolean;
};
