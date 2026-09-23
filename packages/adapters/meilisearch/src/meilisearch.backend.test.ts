import { testSearchAdapter } from "@priemskiyyy/scout/testing";
import { Meilisearch } from "meilisearch";
import { afterAll, beforeAll } from "vitest";

import { meilisearch } from "src/meilisearch";
import { createMeilisearchFake, productIndex } from "src/meilisearch.fixture";

// The index is seeded with the fake's own corpus, so the conformance suite
// checks the same documents here that the fake answers with elsewhere.
const UID = "products";

const client = new Meilisearch({
  host: process.env["MEILISEARCH_URL"] ?? "http://localhost:7700",
  apiKey: "scout-backend-test-master-key",
});

beforeAll(async () => {
  await client.createIndex(UID, { primaryKey: "id" }).waitTask();

  // Meilisearch filters, facets and sorts only the attributes it was told to.
  await client
    .index(UID)
    .updateSettings({
      searchableAttributes: ["title", "brand", "tags"],
      filterableAttributes: ["brand", "price", "inStock", "tags"],
      sortableAttributes: ["price"],
    })
    .waitTask();

  await client
    .index(UID)
    .addDocuments([...createMeilisearchFake().documents])
    .waitTask();
});

afterAll(async () => {
  await client.deleteIndex(UID).waitTask();
});

testSearchAdapter({
  name: "meilisearch against a real server",
  index: productIndex,
  createAdapter: () =>
    meilisearch({
      index: client.index(UID),
      profiles: { titles: { matchingStrategy: "all" } },
    }),
  evaluates: true,
  fixtures: {
    query: "shoe",
    equality: { field: "brand", value: "Apex" },
    range: { field: "price", min: 50, max: 130 },
  },
});
