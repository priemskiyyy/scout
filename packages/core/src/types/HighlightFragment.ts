import type { HighlightPart } from "src/types/HighlightPart";

/**
 * One highlighted value, located by its document `path`. `truncated` is
 * `"unknown"` when the engine does not report whether it shortened the value.
 * Malformed highlight metadata degrades to plain text parts.
 *
 * @example
 * ```ts
 * const fragment: HighlightFragment = { path: ["name"], truncated: false,
 *   parts: [{ text: "Running ", matched: false }, { text: "shoe", matched: true }] };
 * ```
 *
 * @see [SearchHit usage](https://priemskiyyy.github.io/scout/highlights.html)
 */
export type HighlightFragment = {
  readonly path: readonly (string | number)[];
  readonly parts: readonly HighlightPart[];
  readonly truncated: boolean | "unknown";
};
