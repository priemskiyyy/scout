import type { EngineGuide } from "examples/shared/outpost/types/EngineGuide";
import type { EngineId } from "examples/shared/outpost/types/EngineId";

export const ENGINE_IDS: EngineId[] = ["api", "orama", "minisearch", "fuse"];

export const ENGINE_GUIDES: Record<EngineId, EngineGuide> = {
  api: {
    name: "Your API",
    packageName: "@priemskiyyy/scout-http",
    runs: "Behind your own endpoint, served here by the page",
    refuses: "Whatever your backend refuses",
    cancels: "When your client passes the signal on",
  },
  orama: {
    name: "Orama",
    packageName: "@priemskiyyy/scout-orama",
    runs: "In the page, over an Orama database",
    refuses: "Highlights, number facets, sorts by several fields",
    cancels: "Never: it answers before an abort can land",
  },
  minisearch: {
    name: "MiniSearch",
    packageName: "@priemskiyyy/scout-minisearch",
    runs: "In the page, over a MiniSearch index",
    refuses: "Facets and highlights",
    cancels: "Never: it answers before an abort can land",
  },
  fuse: {
    name: "Fuse.js",
    packageName: "@priemskiyyy/scout-fuse",
    runs: "In the page, over a Fuse.js index",
    refuses: "Facets",
    cancels: "Never: it answers before an abort can land",
  },
};
