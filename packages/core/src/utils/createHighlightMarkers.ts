import type { HighlightMarkers } from "src/types/HighlightMarkers";

// `crypto.randomUUID` is absent on older Hermes builds, so React Native gets
// two `Math.random` draws instead of a crash. Neither draw is a cryptographic
// guarantee and neither has to be: the pair only has to be something a corpus
// could not have been written to contain.
const randomToken = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const first = Math.random().toString(36).slice(2);
  const second = Math.random().toString(36).slice(2);
  return `${first}${second}`;
};

/**
 * Mints the marker pair one search wraps its matches in, fresh every time.
 *
 * An engine's default marker is usually `<mark>` or `<em>`, which a document
 * can contain. A document carrying a balanced pair of those parses cleanly and
 * is reported as a match the engine never made, which is a document forging a
 * highlight. An unguessable pair cannot be written into a corpus in advance.
 *
 * `label` only makes the markers legible while debugging; it is the random
 * half that makes them unforgeable.
 *
 * @example
 * ```ts
 * const markers = createHighlightMarkers();
 * const response = await client.search({
 *   highlight_start_tag: markers.open,
 *   highlight_end_tag: markers.close,
 * });
 * const parts = splitHighlight(response.snippet, markers);
 * ```
 */
export const createHighlightMarkers = (label = "scout"): HighlightMarkers => {
  const token = randomToken();
  return { open: `[${label}:${token}]`, close: `[/${label}:${token}]` };
};
