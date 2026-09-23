/**
 * One-based page metadata, derived by the core. `next` is `"unknown"` when
 * the engine's count cannot say whether another page exists; that is preserved
 * rather than guessed, and the TanStack integration documents what it does
 * with it.
 *
 * @example
 * ```ts
 * const page: SearchPage = { current: 1, size: 20, next: "unknown", previous: null };
 * ```
 *
 * @see [Pagination](https://priemskiyyy.github.io/scout/pagination.html)
 */
export type SearchPage = {
  readonly current: number;
  readonly size: number;
  readonly next: number | null | "unknown";
  readonly previous: number | null;
};
