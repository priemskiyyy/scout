/**
 * An attribute name Algolia reads without quotes. Anything else is quoted the
 * way a value is.
 */
export const BARE_ATTRIBUTE =
  /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

/** Algolia reads `_tags` as a tag filter rather than a facet filter. */
export const TAGS_ATTRIBUTE = "_tags";
