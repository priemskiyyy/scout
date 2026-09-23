import { testSearchAdapter } from "@priemskiyyy/scout/testing";

import { meilisearch } from "src/meilisearch";
import { createMeilisearchFake, productIndex } from "src/meilisearch.fixture";

// The fake evaluates the query and the page but not the filter or the sort,
// so the suite checks those translate or refuse, and meilisearch.test.ts pins
// what they translate to.
testSearchAdapter({
  name: "meilisearch",
  index: productIndex,
  createAdapter: () =>
    meilisearch({
      index: createMeilisearchFake().index,
      profiles: { titles: { matchingStrategy: "all" } },
    }),
  fixtures: {
    query: "shoe",
    equality: { field: "brand", value: "Apex" },
    range: { field: "price", min: 50, max: 130 },
  },
});
