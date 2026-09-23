import { Client } from "@opensearch-project/opensearch";
import { testSearchAdapter } from "@priemskiyyy/scout/testing";
import { afterAll, beforeAll } from "vitest";

import { opensearch } from "src/opensearch";
import { createOpenSearchFake, productIndex } from "src/opensearch.fixture";

// The index is seeded with the fake's own corpus and mapped the way the fake
// maps it, so the conformance suite checks the same documents here that the
// fake answers with elsewhere.
const INDEX = "products";

const client = new Client({
  node: process.env["OPENSEARCH_URL"] ?? "http://localhost:9201",
});

beforeAll(async () => {
  await client.indices.create({
    index: INDEX,
    body: {
      mappings: {
        dynamic: "strict",
        properties: {
          id: { type: "keyword" },
          name: { type: "text" },
          brand: { type: "text", fields: { keyword: { type: "keyword" } } },
          price: { type: "integer" },
          inStock: { type: "boolean" },
          tags: { type: "keyword" },
        },
      },
    },
  });

  // A refresh makes every document searchable before the suite runs.
  await client.bulk({
    index: INDEX,
    refresh: true,
    body: createOpenSearchFake().documents.flatMap((document) => [
      { index: { _id: document.id } },
      document,
    ]),
  });
});

afterAll(async () => {
  await client.indices.delete({ index: INDEX });
  await client.close();
});

testSearchAdapter({
  name: "opensearch against a real server",
  index: productIndex,
  createAdapter: () =>
    opensearch({
      client,
      index: INDEX,
      keywords: { brand: "brand.keyword" },
    }),
  evaluates: true,
  fixtures: {
    query: "shoe",
    equality: { field: "brand", value: "Nimbus" },
    range: { field: "price", min: 100, max: 200 },
  },
});
