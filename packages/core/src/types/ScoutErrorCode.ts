/**
 * The closed set of reasons a Scout call fails. Every thrown error carries one,
 * so a handler can dispatch on `error.code` and close the union with
 * `assertUnreachable`, or narrow with `instanceof` on the matching subclass.
 *
 * @example
 * ```ts
 * const retryable: readonly ScoutErrorCode[] = ["provider"];
 * ```
 *
 * @see [ScoutError usage](https://priemskiyyy.github.io/scout/troubleshooting.html)
 */
export type ScoutErrorCode =
  | "validation"
  | "unsupported-feature"
  | "provider"
  | "aborted"
  | "disposed"
  | "configuration";
