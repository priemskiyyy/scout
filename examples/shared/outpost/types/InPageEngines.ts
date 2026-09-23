import type Fuse from "fuse.js";
import type MiniSearch from "minisearch";

import type { createOramaDatabase } from "examples/shared/outpost/engines/createOramaDatabase";
import type { Product } from "examples/shared/outpost/types/Product";

/** The three engines that run in the page, built once from the catalogue. */
export type InPageEngines = {
  orama: ReturnType<typeof createOramaDatabase>;
  minisearch: MiniSearch<Product>;
  fuse: Fuse<Product>;
};
