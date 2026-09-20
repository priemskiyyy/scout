import { testSearchAdapter } from "@priemskiyyy/scout/testing";
import { typesense } from "src/typesense";
import { createTypesenseFake } from "src/typesense.fixture";

testSearchAdapter({
  name: "typesense",
  createAdapter: () =>
    typesense({
      client: createTypesenseFake().client,
      collection: "products",
      profiles: {
        default: { queryBy: ["name", "brand", "tags"], prefix: true },
        exact: { queryBy: ["name"], prefix: false },
      },
      sorts: { relevance: {}, priceAsc: { sortBy: "price:asc" } },
      facets: { price: "number", inStock: "boolean" },
    }),
  fixtures: {
    index: "products",
    query: "shoe",
    sort: "relevance",
    profile: "default",
    equality: { field: "brand", value: "Nimbus" },
    range: { field: "price", min: 100, max: 200 },
    facet: "brand",
    highlight: "name",
  },
});
