import { testSearchAdapter } from "@priemskiyyy/scout/testing";
import { minisearch } from "src/minisearch";
import { createProductIndex } from "src/minisearch.fixture";

// MiniSearch runs in process, so this is the real engine over a real index
// rather than a fake of one. The suite skips the facet and highlight blocks by
// itself, because the adapter declares that it cannot do either.
testSearchAdapter({
  name: "minisearch",
  createAdapter: () =>
    minisearch({
      index: createProductIndex(),
      revision: () => "fixture",
      profiles: {
        default: { fields: ["title", "category", "tags"], prefix: true },
      },
      sorts: { relevance: "relevance" },
    }),
  fixtures: {
    index: "products",
    query: "shoe",
    sort: "relevance",
    profile: "default",
    // A real in-process engine, so the suite can assert which documents
    // came back rather than only that the request was well formed.
    evaluatesFilters: true,
    equality: { field: "category", value: "footwear" },
    range: { field: "price", min: 10, max: 150 },
  },
});
