import { testSearchAdapter } from "@priemskiyyy/scout/testing";

import { opensearch } from "src/opensearch";
import { createOpenSearchFake, productIndex } from "src/opensearch.fixture";

// The fake evaluates the query, the filter, the sort, the page, the
// aggregations and the highlights, so the suite checks what came back.
testSearchAdapter({
  name: "opensearch",
  index: productIndex,
  evaluates: true,
  createAdapter: () =>
    opensearch({
      client: createOpenSearchFake().client,
      index: "products",
      keywords: { brand: "brand.keyword" },
    }),
  fixtures: {
    query: "shoe",
    equality: { field: "brand", value: "Nimbus" },
    range: { field: "price", min: 100, max: 200 },
  },
});
