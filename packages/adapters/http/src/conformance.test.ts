import { testSearchAdapter } from "@priemskiyyy/scout/testing";

import { http } from "src/http";
import { createSearchBackend, productIndex } from "src/http.fixture";

// The backend behind the client evaluates the query, the filter, the sort,
// the page and the facets it is sent, so the suite asserts which documents
// came back, over the wire format end to end.
testSearchAdapter({
  name: "http",
  index: productIndex,
  createAdapter: () =>
    http({
      fingerprint: "catalogue-api",
      request: createSearchBackend().request,
    }),
  evaluates: true,
  fixtures: {
    query: "shoe",
    equality: { field: "brand", value: "Apex" },
    range: { field: "price", min: 50, max: 130 },
  },
});
