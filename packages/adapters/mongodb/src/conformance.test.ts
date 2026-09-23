import { testSearchAdapter } from "@priemskiyyy/scout/testing";

import { mongodb } from "src/mongodb";
import { createMongoFake, productIndex } from "src/mongodb.fixture";

// The fake evaluates the whole pipeline, the filter operators, the sort, the
// page, the count and the facets among it, so the suite checks the documents
// that come back, and mongodb.test.ts pins the pipeline they came from.
testSearchAdapter({
  name: "mongodb",
  index: productIndex,
  createAdapter: () =>
    mongodb({
      collection: createMongoFake().collection,
      tokens: ["brand", "category", "tags"],
    }),
  evaluates: true,
  fixtures: {
    query: "shoe",
    equality: { field: "brand", value: "Nimbus" },
    range: { field: "price", min: 100, max: 200 },
  },
});
