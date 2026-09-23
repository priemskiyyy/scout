import { search } from "@orama/orama";
import { testSearchAdapter } from "@priemskiyyy/scout/testing";

import { orama } from "src/orama";
import {
  createProductDatabase,
  PRODUCT_PROFILES,
  productIndex,
} from "src/orama.fixture";

// Orama runs in process, so the suite searches a real database holding real
// documents, and asserts which of them came back.
testSearchAdapter({
  name: "orama",
  index: productIndex,
  createAdapter: () =>
    orama({
      db: createProductDatabase(),
      search,
      revision: () => 1,
      profiles: PRODUCT_PROFILES,
    }),
  evaluates: true,
  fixtures: {
    query: "headphones",
    // `brand` is declared `enum`, which is the only way Orama matches a value
    // of several tokens exactly.
    equality: { field: "brand", value: "Acme Audio" },
    range: { field: "price", min: 50, max: 200 },
  },
});
