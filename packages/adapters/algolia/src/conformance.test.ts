import { testSearchAdapter } from "@priemskiyyy/scout/testing";

import { algolia } from "src/algolia";
import { createAlgoliaFake, productIndex } from "src/algolia.fixture";

// Only Algolia knows what a filters string means, so the fake evaluates the
// query and the page but not the filters or the replica's order. The suite
// checks those translate or refuse, and algolia.test.ts pins the strings.
testSearchAdapter({
  name: "algolia",
  index: productIndex,
  createAdapter: () =>
    algolia({
      client: createAlgoliaFake().client,
      indexName: "products",
      replicas: { priceAsc: "products_price_asc" },
      profiles: { titles: { typoTolerance: false } },
    }),
  fixtures: {
    query: "running",
    equality: { field: "brand", value: "acme" },
    range: { field: "price", min: 10, max: 100 },
  },
});
