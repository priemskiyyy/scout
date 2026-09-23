import Fuse from "fuse.js";

import { PRODUCTS } from "examples/shared/outpost/constants/products";

/**
 * The catalogue as a Fuse.js index. `includeMatches` is what lets the adapter
 * highlight, from the ranges Fuse reports.
 *
 * @example
 * ```ts
 * const index = createFuseIndex();
 * ```
 */
export const createFuseIndex = () =>
  new Fuse(PRODUCTS, {
    keys: ["name", "description", "tags"],
    includeMatches: true,
    includeScore: true,
    ignoreLocation: true,
    threshold: 0.35,
  });
