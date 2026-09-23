import type { MeilisearchSearchParams } from "src/types/MeilisearchSearchParams";

/**
 * Whether a highlight may be cut short. Meilisearch never says whether it
 * cut a value short, so a cropped search admits it does not know, and an
 * uncropped one knows nothing was cut.
 *
 * @example
 * ```ts
 * getHighlightTruncationFromParameters({ attributesToCrop: ["title"] }); // "unknown"
 * ```
 */
export const getHighlightTruncationFromParameters = (
  params: MeilisearchSearchParams,
): boolean | "unknown" => {
  if (
    params.attributesToCrop !== undefined &&
    params.attributesToCrop.length > 0
  ) {
    return "unknown";
  }

  return false;
};
