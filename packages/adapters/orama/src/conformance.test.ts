import { search } from "@orama/orama";
import { testSearchAdapter } from "@priemskiyyy/scout/testing";
import { orama } from "src/orama";
import {
  createProductDatabase,
  PRODUCT_PROFILES,
  PRODUCT_SORTS,
} from "src/orama.fixture";

// The engine is in process, so the suite runs against a real database holding
// real documents rather than against a stand in for one.
const db = createProductDatabase();

testSearchAdapter({
  name: "orama",
  createAdapter: () =>
    orama({
      db,
      search,
      revision: () => "1",
      profiles: PRODUCT_PROFILES,
      sorts: PRODUCT_SORTS,
    }),
  fixtures: {
    index: "products",
    query: "headphones",
    sort: "relevance",
    profile: "default",
    // `brand` is declared `enum`, which is the only way Orama matches a value
    // of several tokens exactly.
    // A real in-process engine, so the suite can assert which documents
    // came back rather than only that the request was well formed.
    evaluatesFilters: true,
    equality: { field: "brand", value: "Acme Audio" },
    range: { field: "price", min: 50, max: 200 },
    facet: "brand",
  },
});
