import { insert, search } from "@orama/orama";
import { searchKey, UnsupportedSearchFeatureError } from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  FilterExpression,
  FilterOperator,
} from "@priemskiyyy/scout";
import { expect, test } from "vitest";
import { orama } from "src/orama";
import {
  createProductDatabase,
  PRODUCT_PROFILES,
  PRODUCT_SORTS,
} from "src/orama.fixture";

const adapterFor = (
  db: ReturnType<typeof createProductDatabase>,
  revision: () => string | number = () => "1",
) =>
  orama({
    db,
    search,
    revision,
    profiles: PRODUCT_PROFILES,
    sorts: PRODUCT_SORTS,
  });

const request = (
  overrides: Partial<AdapterSearchRequest<never>> = {},
): AdapterSearchRequest<never> => ({
  index: "products",
  query: "",
  profile: "default",
  sort: "relevance",
  filter: { type: "constant", value: true },
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

const run = (
  adapter: ReturnType<typeof adapterFor>,
  overrides: Partial<AdapterSearchRequest<never>> = {},
) =>
  adapter.search(request(overrides), { signal: new AbortController().signal });

const ids = (response: {
  hits: readonly { native: { id: string } }[];
}): readonly string[] => response.hits.map((hit) => hit.native.id);

const sortedIds = (response: {
  hits: readonly { native: { id: string } }[];
}): readonly string[] => [...ids(response)].sort();

const comparison = (
  field: string,
  operator: FilterOperator,
  value: unknown,
): FilterExpression => ({ type: "comparison", field, operator, value });

test("the fingerprint carries the corpus revision and nothing secret", () => {
  const adapter = adapterFor(createProductDatabase(), () => "v7");

  expect(adapter.fingerprint()).toBe("orama:v7");
});

test("mutating the corpus and bumping the revision changes the query identity", async () => {
  const db = createProductDatabase();
  let revision = 1;
  const adapter = adapterFor(db, () => revision);
  const before = adapter.fingerprint();
  const first = await run(adapter);

  insert(db, {
    id: "p7",
    name: "Standing Desk",
    description: "Adjustable height frame",
    brand: "Delta Home",
    category: "kitchen",
    price: 420,
    inStock: true,
  });
  revision += 1;
  const after = adapter.fingerprint();
  const second = await run(adapter);

  expect(before).toBe("orama:1");
  expect(after).toBe("orama:2");
  // The fingerprint is what carries the revision into the query identity, so
  // the same search over a changed corpus is a different cached query.
  expect(searchKey(request(), after)).not.toEqual(searchKey(request(), before));
  expect(first.total).toEqual({
    value: 6,
    accuracy: "exact",
    scope: "matches",
  });
  expect(second.total).toEqual({
    value: 7,
    accuracy: "exact",
    scope: "matches",
  });
});

test("inserting without bumping the revision leaves the identity alone", async () => {
  const db = createProductDatabase();
  const adapter = adapterFor(db, () => 1);
  const before = adapter.fingerprint();

  insert(db, {
    id: "p7",
    name: "Standing Desk",
    description: "Adjustable height frame",
    brand: "Delta Home",
    category: "kitchen",
    price: 420,
    inStock: true,
  });
  const response = await run(adapter);

  // The corpus answers differently while the identity says it did not change,
  // which is exactly the staleness the revision exists to prevent.
  expect(adapter.fingerprint()).toBe(before);
  expect(searchKey(request(), adapter.fingerprint())).toEqual(
    searchKey(request(), before),
  );
  expect(response.total).toEqual({
    value: 7,
    accuracy: "exact",
    scope: "matches",
  });
});

test("a page becomes Orama's limit and offset", async () => {
  const adapter = adapterFor(createProductDatabase());

  const response = await run(adapter, {
    page: { current: 2, size: 2 },
    sort: "priceAsc",
  });

  expect(response.page).toEqual({
    kind: "page",
    current: 2,
    size: 2,
    next: 3,
    previous: 1,
  });
  expect(ids(response)).toEqual(["p4", "p2"]);
});

test("the last page reports no next page, because the count is exact", async () => {
  const adapter = adapterFor(createProductDatabase());

  const response = await run(adapter, {
    page: { current: 3, size: 2 },
    sort: "priceAsc",
  });

  expect(response.page.next).toBeNull();
  expect(response.total).toEqual({
    value: 6,
    accuracy: "exact",
    scope: "matches",
  });
});

test("a named sort is translated into Orama's own ordering", async () => {
  const adapter = adapterFor(createProductDatabase());

  const response = await run(adapter, { sort: "priceDesc" });

  expect(ids(response)).toEqual(["p1", "p3", "p2", "p4", "p6", "p5"]);
});

test("an equality on an enum property matches the value and not its tokens", async () => {
  const adapter = adapterFor(createProductDatabase());

  const whole = await run(adapter, {
    filter: comparison("brand", "eq", "Acme Audio"),
  });
  const token = await run(adapter, {
    filter: comparison("brand", "eq", "Acme"),
  });

  expect(ids(whole)).toEqual(["p1", "p2"]);
  expect(token.hits).toHaveLength(0);
});

test("a filter on a string property is refused rather than matched by token", async () => {
  const adapter = adapterFor(createProductDatabase());

  await expect(
    run(adapter, { filter: comparison("name", "eq", "Wireless Headphones") }),
  ).rejects.toThrowError(/matches a string property by token/);
});

test("a filter on a property the schema never declared is refused", async () => {
  const adapter = adapterFor(createProductDatabase());

  await expect(
    run(adapter, { filter: comparison("colour", "eq", "black") }),
  ).rejects.toThrowError(UnsupportedSearchFeatureError);
});

test("ordering an enum property is refused rather than guessed", async () => {
  const adapter = adapterFor(createProductDatabase());

  await expect(
    run(adapter, { filter: comparison("brand", "gt", "Acme Audio") }),
  ).rejects.toThrowError(/order only a number property/);
});

test("an equality whose value the property cannot hold is refused", async () => {
  const adapter = adapterFor(createProductDatabase());

  await expect(
    run(adapter, { filter: comparison("price", "eq", "199") }),
  ).rejects.toThrowError(/needs a number to apply eq/);
});

test("a range keeps only the documents inside it", async () => {
  const adapter = adapterFor(createProductDatabase());

  const response = await run(adapter, {
    filter: {
      type: "and",
      expressions: [
        comparison("price", "gte", 50),
        comparison("price", "lte", 150),
      ],
    },
  });

  expect(sortedIds(response)).toEqual(["p2", "p3"]);
});

test("between bounds a number property at both ends", async () => {
  const adapter = adapterFor(createProductDatabase());

  const response = await run(adapter, {
    filter: comparison("price", "between", [35, 99]),
  });

  expect(sortedIds(response)).toEqual(["p2", "p4", "p6"]);
});

test("a negated equality answers with the complement of the corpus", async () => {
  const adapter = adapterFor(createProductDatabase());

  const response = await run(adapter, {
    filter: comparison("brand", "neq", "Acme Audio"),
  });

  expect(sortedIds(response)).toEqual(["p3", "p4", "p5", "p6"]);
});

test("in becomes a union and notIn its complement", async () => {
  const adapter = adapterFor(createProductDatabase());

  const inside = await run(adapter, {
    filter: comparison("category", "in", ["input", "kitchen"]),
  });
  const outside = await run(adapter, {
    filter: comparison("category", "not-in", ["input", "kitchen"]),
  });

  expect(sortedIds(inside)).toEqual(["p3", "p4", "p5", "p6"]);
  expect(sortedIds(outside)).toEqual(["p1", "p2"]);
});

test("a union of equalities covers every kind Orama matches by value", async () => {
  const adapter = adapterFor(createProductDatabase());

  const numbers = await run(adapter, {
    filter: comparison("price", "in", [15, 199]),
  });
  const booleans = await run(adapter, {
    filter: comparison("inStock", "in", [false]),
  });

  expect(sortedIds(numbers)).toEqual(["p1", "p5"]);
  expect(sortedIds(booleans)).toEqual(["p2", "p5"]);
});

test("or and not nest inside and", async () => {
  const adapter = adapterFor(createProductDatabase());

  const response = await run(adapter, {
    filter: {
      type: "and",
      expressions: [
        {
          type: "or",
          expressions: [
            comparison("category", "eq", "input"),
            comparison("category", "eq", "kitchen"),
          ],
        },
        { type: "not", expression: comparison("inStock", "eq", false) },
      ],
    },
  });

  expect(sortedIds(response)).toEqual(["p3", "p4", "p6"]);
});

test("a contradiction answers without scanning the corpus", async () => {
  const calls: unknown[] = [];
  const counted = orama({
    db: createProductDatabase(),
    search: (_db, params) => {
      calls.push(params);
      return { count: 0, hits: [] };
    },
    revision: () => "1",
    profiles: PRODUCT_PROFILES,
    sorts: PRODUCT_SORTS,
  });

  const none = await counted.search(
    request({ filter: { type: "constant", value: false }, facets: ["brand"] }),
    { signal: new AbortController().signal },
  );
  const all = await run(adapterFor(createProductDatabase()), {
    filter: { type: "constant", value: true },
  });

  // Orama has no contradiction to evaluate cheaply, so the answer is given
  // here rather than paid for with a full scan.
  expect(calls).toEqual([]);
  expect(none.hits).toHaveLength(0);
  expect(none.total).toEqual({ value: 0, accuracy: "exact", scope: "matches" });
  expect(none.facets["brand"]).toEqual({
    field: "brand",
    values: [],
    exhaustive: true,
    native: null,
  });
  expect(none.native).toBeNull();
  expect(all.hits).toHaveLength(6);
});
