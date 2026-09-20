import { testSearchAdapter } from "@priemskiyyy/scout/testing";
import { fuse } from "src/fuse";
import { createProductIndex } from "src/fuse.fixture";

testSearchAdapter({
  name: "fuse",
  createAdapter: () =>
    fuse({
      index: createProductIndex(),
      revision: () => "fixture",
      profiles: { default: null },
      sorts: { relevance: null },
    }),
  fixtures: {
    index: "products",
    query: "shoe",
    sort: "relevance",
    profile: "default",
    evaluatesFilters: true,
    equality: { field: "category", value: "footwear" },
    range: { field: "price", min: 10, max: 150 },
    highlight: "title",
  },
});
