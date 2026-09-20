/**
 * One-based page metadata. Adapters translate provider numbering, so Algolia's
 * zero-based page 0 arrives here as page 1.
 *
 * `next` is `"unknown"` when the engine cannot say whether another page exists.
 * That is preserved rather than guessed; the TanStack integration decides what
 * to do with it and documents the choice.
 *
 * @example
 * ```ts
 * const page: SearchPage = { kind: "page", current: 1, size: 20, next: "unknown", previous: null };
 * ```
 *
 * @see [SearchResult usage](https://priemskiyyy.github.io/scout/pagination.html)
 */
export type SearchPage = {
  readonly kind: "page";
  readonly current: number;
  readonly size: number;
  readonly next: number | null | "unknown";
  readonly previous: number | null;
};
