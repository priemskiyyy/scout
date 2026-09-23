import { testSearchAdapter } from "@priemskiyyy/scout/testing";
import { MongoClient } from "mongodb";
import { setTimeout } from "node:timers/promises";
import { afterAll, beforeAll } from "vitest";

import { mongodb } from "src/mongodb";
import { createMongoFake, productIndex } from "src/mongodb.fixture";
import type { MongoFakeProduct } from "src/mongodb.fixture";

// The collection is seeded with the fake's own corpus, so the conformance
// suite checks the same documents here that the fake answers with elsewhere.
const { documents } = createMongoFake();

const client = new MongoClient(
  process.env["MONGODB_URL"] ??
    "mongodb://localhost:27017/?directConnection=true",
);

const collection = client.db("shop").collection<MongoFakeProduct>("products");

// mongot builds a search index apart from the database, and refuses a search
// on it until it reports the index queryable.
const isQueryable = async (): Promise<boolean> => {
  const [description] = await collection.listSearchIndexes("default").toArray();

  return (
    description !== undefined &&
    "queryable" in description &&
    description.queryable === true
  );
};

beforeAll(async () => {
  await client.connect();
  await collection.insertMany([...documents]);

  await collection.createSearchIndex({
    name: "default",
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          name: { type: "string" },
          // Searched as text, and compared and faceted as one token.
          brand: [{ type: "string" }, { type: "token" }],
          category: { type: "token" },
          tags: { type: "token" },
          price: { type: "number" },
          inStock: { type: "boolean" },
        },
      },
    },
  });

  while (!(await isQueryable())) {
    await setTimeout(1_000);
  }
});

afterAll(async () => {
  await collection.drop();
  await client.close();
});

testSearchAdapter({
  name: "mongodb against a real server",
  index: productIndex,
  createAdapter: () =>
    mongodb({ collection, tokens: ["brand", "category", "tags"] }),
  evaluates: true,
  fixtures: {
    query: "shoe",
    equality: { field: "brand", value: "Nimbus" },
    range: { field: "price", min: 100, max: 200 },
  },
});
