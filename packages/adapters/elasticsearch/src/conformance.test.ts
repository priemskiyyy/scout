import { testSearchAdapter } from "@priemskiyyy/scout/testing";

import { elasticsearch } from "src/elasticsearch";
import {
  createElasticsearchFake,
  productIndex,
} from "src/elasticsearch.fixture";

// The fake evaluates the query, the filter, the sort, the page, the
// aggregations and the highlights, so the suite checks what came back.
testSearchAdapter({
  name: "elasticsearch",
  index: productIndex,
  evaluates: true,
  createAdapter: () =>
    elasticsearch({
      client: createElasticsearchFake().client,
      index: "products",
      keywords: { brand: "brand.keyword" },
    }),
  fixtures: {
    query: "shoe",
    equality: { field: "brand", value: "Nimbus" },
    range: { field: "price", min: 100, max: 200 },
  },
});
