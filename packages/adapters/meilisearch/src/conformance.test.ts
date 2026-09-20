import { testSearchAdapter } from "@priemskiyyy/scout/testing";
import { meilisearch } from "src/meilisearch";
import { createMeilisearchFake } from "src/meilisearch.fixture";

testSearchAdapter({
  name: "meilisearch",
  createAdapter: () =>
    meilisearch({
      index: createMeilisearchFake().index,
      profiles: { default: {}, titles: { attributesToSearchOn: ["title"] } },
      sorts: { relevance: {}, cheapest: { sort: ["price:asc"] } },
    }),
  fixtures: {
    index: "products",
    query: "shoe",
    sort: "relevance",
    profile: "default",
    equality: { field: "brand", value: "Apex" },
    range: { field: "price", min: 50, max: 130 },
    facet: "brand",
    highlight: "title",
  },
});
