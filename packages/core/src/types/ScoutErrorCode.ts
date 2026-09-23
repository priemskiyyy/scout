/**
 * What went wrong, for an error Scout itself created.
 *
 * - `configuration`: options that cannot work, such as an unknown index, a
 *   missing adapter, or a filter value with no canonical form.
 * - `unsupported-feature`: the engine cannot express part of the search, so it
 *   was refused rather than silently narrowed.
 * - `validation`: a document the engine returned failed the index schema.
 * - `provider`: the engine or its SDK failed. The original is the `cause`.
 * - `aborted`: the caller's signal aborted the search.
 * - `disposed`: the `Scout` was disposed before the search settled.
 *
 * @example
 * ```ts
 * const retryable: readonly ScoutErrorCode[] = ["provider"];
 * ```
 *
 * @see [Troubleshooting](https://priemskiyyy.github.io/scout/troubleshooting.html)
 */
export type ScoutErrorCode =
  | "configuration"
  | "unsupported-feature"
  | "validation"
  | "provider"
  | "aborted"
  | "disposed";
