import { testSearchAdapter } from "@priemskiyyy/scout/testing";
import { Client } from "typesense";
import { afterAll, beforeAll } from "vitest";

import { typesense } from "src/typesense";
import { createTypesenseFake, productIndex } from "src/typesense.fixture";

// The collection is seeded with the fake's own corpus, so the conformance
// suite checks the same documents here that the fake answers with elsewhere.
const COLLECTION = "products";
const url = new URL(process.env["TYPESENSE_URL"] ?? "http://localhost:8108");

const client = new Client({
  nodes: [
    {
      host: url.hostname,
      port: Number(url.port),
      protocol: url.protocol.replace(":", ""),
    },
  ],
  apiKey: "scout-backend-test",
  connectionTimeoutSeconds: 10,
});

beforeAll(async () => {
  await client.collections().create({
    name: COLLECTION,
    fields: [
      { name: "name", type: "string" },
      { name: "brand", type: "string", facet: true },
      { name: "price", type: "int32", facet: true },
      { name: "inStock", type: "bool", facet: true },
      { name: "tags", type: "string[]", facet: true },
    ],
  });

  await client
    .collections(COLLECTION)
    .documents()
    .import([...createTypesenseFake().documents], { action: "create" });
});

afterAll(async () => {
  await client.collections(COLLECTION).delete();
});

testSearchAdapter({
  name: "typesense against a real server",
  index: productIndex,
  createAdapter: () =>
    typesense({
      client,
      collection: COLLECTION,
      profiles: { exact: { prefix: false } },
    }),
  evaluates: true,
  fixtures: {
    query: "shoe",
    equality: { field: "brand", value: "Nimbus" },
    range: { field: "price", min: 100, max: 200 },
  },
});
