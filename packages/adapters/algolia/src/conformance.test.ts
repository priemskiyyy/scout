import { testSearchAdapter } from "@priemskiyyy/scout/testing";
import { algolia } from "src/algolia";
import { createAlgoliaFake } from "src/algolia.fixture";

testSearchAdapter({
  name: "algolia",
  createAdapter: () =>
    algolia({
      client: createAlgoliaFake().client,
      index: { name: "products" },
      sorts: {
        relevance: { index: { name: "products" } },
        priceAsc: { index: { name: "products_price_asc" } },
      },
      profiles: { default: {} },
    }),
  fixtures: {
    index: "products",
    query: "running",
    sort: "relevance",
    profile: "default",
    equality: { field: "brand", value: "acme" },
    range: { field: "price", min: 10, max: 100 },
    facet: "brand",
    highlight: "title",
  },
});
