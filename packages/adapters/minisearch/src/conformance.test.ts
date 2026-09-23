import { testSearchAdapter } from "@priemskiyyy/scout/testing";
import MiniSearch from "minisearch";

import { minisearch } from "src/minisearch";
import { createProductIndex, productIndex } from "src/minisearch.fixture";

// MiniSearch runs in process, so this is the real engine over a real index,
// and the suite can assert which documents came back.
testSearchAdapter({
  name: "minisearch",
  index: productIndex,
  createAdapter: () =>
    minisearch({
      index: createProductIndex(),
      wildcard: MiniSearch.wildcard,
      revision: () => "fixture",
      profiles: { titles: { prefix: true } },
    }),
  evaluates: true,
  fixtures: {
    query: "shoe",
    equality: { field: "category", value: "footwear" },
    range: { field: "price", min: 10, max: 150 },
  },
});
