import { createCatalogueBackend } from "examples/shared/outpost/backend/createCatalogueBackend";
import { createFuseIndex } from "examples/shared/outpost/engines/createFuseIndex";
import { createMiniSearchIndex } from "examples/shared/outpost/engines/createMiniSearchIndex";
import { createOramaDatabase } from "examples/shared/outpost/engines/createOramaDatabase";
import { createOutpostRuntime } from "examples/shared/outpost/runtime/createOutpostRuntime";
import { createTimeline } from "examples/shared/outpost/runtime/createTimeline";
import type { Outpost } from "examples/shared/outpost/types/Outpost";

type StartOutpostOptions = { latency: number };

/**
 * Everything the page needs, once: your API, the in-page engines, the
 * timeline and the first Scout over them.
 *
 * @example
 * ```ts
 * const { outpost, runtime } = startOutpost({ latency: 400 });
 * ```
 */
export const startOutpost = ({ latency }: StartOutpostOptions) => {
  const outpost: Outpost = {
    backend: createCatalogueBackend({ latency }),
    engines: {
      orama: createOramaDatabase(),
      minisearch: createMiniSearchIndex(),
      fuse: createFuseIndex(),
    },
    timeline: createTimeline(),
  };

  const runtime = createOutpostRuntime({ ...outpost, validate: "error" });

  return { outpost, runtime };
};
