import { expect, test } from "vitest";

import { translateSearch } from "examples/shared/outpost/dialects/translateSearch";
import { initialStoreState } from "examples/shared/outpost/state/storeReducer";

test("the store's search reaches every dialect, and MongoDB refuses a boolean facet", async () => {
  const translations = await translateSearch(initialStoreState, "store");

  expect(translations.portable).toMatchObject({
    kind: "sent",
    request: { query: "tent", facets: ["brand", "category", "inStock"] },
  });
  expect(translations.typesense).toMatchObject({
    kind: "sent",
    request: { q: "tent", facet_by: "brand,category,inStock" },
  });
  expect(translations.mongodb).toEqual({
    kind: "refused",
    message: expect.stringContaining("inStock"),
  });
});

test("Algolia refuses a negated group that the others translate", async () => {
  const translations = await translateSearch(
    { ...initialStoreState, facets: false },
    "negated",
  );

  expect(translations.algolia.kind).toBe("refused");
  expect(translations.elasticsearch.kind).toBe("sent");
  expect(translations.mongodb.kind).toBe("sent");
});

test("Typesense refuses a page of 500 and the others take it", async () => {
  const translations = await translateSearch(initialStoreState, "large");

  expect(translations.typesense.kind).toBe("refused");
  expect(translations.meilisearch.kind).toBe("sent");
});

test("a hostile value reaches Typesense escaped inside its backticks", async () => {
  const translations = await translateSearch(initialStoreState, "hostile");

  expect(translations.typesense).toMatchObject({
    kind: "sent",
    request: {
      filter_by: expect.stringContaining("brand:=`He said"),
    },
  });
});

test("an empty set is answered by Scout, so no dialect is sent anything", async () => {
  const translations = await translateSearch(
    { ...initialStoreState, emptySet: true },
    "store",
  );

  expect(new Set(Object.values(translations).map((each) => each.kind))).toEqual(
    new Set(["answered-by-scout"]),
  );
});
