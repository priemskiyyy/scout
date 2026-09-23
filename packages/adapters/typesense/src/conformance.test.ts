import { testSearchAdapter } from "@priemskiyyy/scout/testing";

import { typesense } from "src/typesense";
import { createTypesenseFake, productIndex } from "src/typesense.fixture";

// The fake evaluates the query and the page but not filter_by or sort_by, so
// the suite checks those translate or refuse, and typesense.test.ts pins what
// they translate to.
testSearchAdapter({
  name: "typesense",
  index: productIndex,
  createAdapter: () =>
    typesense({
      client: createTypesenseFake().client,
      collection: "products",
      profiles: { exact: { prefix: false } },
    }),
  fixtures: {
    query: "shoe",
    equality: { field: "brand", value: "Nimbus" },
    range: { field: "price", min: 100, max: 200 },
  },
});
