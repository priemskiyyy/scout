import { search } from "@orama/orama";
import { Scout } from "@priemskiyyy/scout";
import { fuse } from "@priemskiyyy/scout-fuse";
import { http } from "@priemskiyyy/scout-http";
import { minisearch } from "@priemskiyyy/scout-minisearch";
import { orama } from "@priemskiyyy/scout-orama";
import MiniSearch from "minisearch";

import { API_FINGERPRINT } from "examples/shared/outpost/constants/backend";
import { CATALOGUE_REVISION } from "examples/shared/outpost/constants/catalogue";
import { traceAdapter } from "examples/shared/outpost/runtime/traceAdapter";
import { createProductIndex } from "examples/shared/outpost/utils/createProductIndex";
import type { Outpost } from "examples/shared/outpost/types/Outpost";
import type { OutpostRuntime } from "examples/shared/outpost/types/OutpostRuntime";
import type { ValidationMode } from "examples/shared/outpost/types/ValidationMode";

type OutpostRuntimeOptions = Outpost & { validate: ValidationMode };

/**
 * One Scout over one index declaration, bound to four engines: your API
 * through the HTTP adapter, and Orama, MiniSearch and Fuse.js in the page.
 * A disposed Scout cannot search again, so a restart builds a new runtime.
 *
 * @example
 * ```ts
 * const runtime = createOutpostRuntime({ backend, engines, timeline, validate: "error" });
 * const result = await runtime.indexes.orama.search("tent").execute();
 * ```
 */
export const createOutpostRuntime = ({
  backend,
  engines,
  timeline,
  validate,
}: OutpostRuntimeOptions): OutpostRuntime => {
  const products = createProductIndex(validate);
  const revision = () => CATALOGUE_REVISION;

  const scout = new Scout({
    indexes: {
      api: products,
      orama: products,
      minisearch: products,
      fuse: products,
    },
    adapters: {
      api: traceAdapter(
        "api",
        http({ fingerprint: API_FINGERPRINT, request: backend.search }),
        timeline.record,
      ),
      orama: traceAdapter(
        "orama",
        orama({
          db: engines.orama,
          search,
          revision,
          profiles: { default: { tolerance: 1 }, names: { tolerance: 1 } },
        }),
        timeline.record,
      ),
      minisearch: traceAdapter(
        "minisearch",
        minisearch({
          index: engines.minisearch,
          wildcard: MiniSearch.wildcard,
          revision,
          profiles: {
            default: { prefix: true, fuzzy: 0.2 },
            names: { prefix: true, fuzzy: 0.2 },
          },
        }),
        timeline.record,
      ),
      fuse: traceAdapter(
        "fuse",
        fuse({ index: engines.fuse, revision }),
        timeline.record,
      ),
    },
  });

  return {
    indexes: {
      api: scout.index("api"),
      orama: scout.index("orama"),
      minisearch: scout.index("minisearch"),
      fuse: scout.index("fuse"),
    },
    validate,
    timeline: timeline.log,
    record: timeline.record,
    dispose: () => {
      scout.dispose();
      timeline.record({ kind: "disposed" });
    },
  };
};
