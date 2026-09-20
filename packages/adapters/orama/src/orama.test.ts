import { insert, search } from "@orama/orama";
import {
  SearchConfigurationError,
  searchKey,
  UnsupportedSearchFeatureError,
} from "@priemskiyyy/scout";
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

const NANOSECONDS_PER_MILLISECOND = 1_000_000;

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

test("a facet reports every bucket it counted and says so", async () => {
  const adapter = adapterFor(createProductDatabase());

  const response = await run(adapter, { facets: ["brand"] });

  expect(response.facets["brand"]).toEqual({
    field: "brand",
    values: [
      { value: "Acme Audio", count: 2 },
      { value: "Beta Input", count: 2 },
      { value: "Delta Home", count: 2 },
    ],
    exhaustive: true,
    native: {
      count: 3,
      values: { "Acme Audio": 2, "Beta Input": 2, "Delta Home": 2 },
    },
  });
});

test("a truncated facet says it was not exhaustive rather than looking whole", async () => {
  const db = createProductDatabase();
  for (let extra = 0; extra < 12; extra += 1) {
    insert(db, {
      id: `x${extra}`,
      name: `Gadget${extra}`,
      description: "Spare inventory",
      brand: "Delta Home",
      category: "kitchen",
      price: 10 + extra,
      inStock: true,
    });
  }
  const adapter = adapterFor(db);

  const response = await run(adapter, { facets: ["name"] });
  const facet = response.facets["name"];

  // Orama counts every distinct value of a string property and then returns
  // ten of them, so the adapter reports the shorter list as incomplete.
  expect(facet?.values).toHaveLength(10);
  expect(facet?.exhaustive).toBe(false);
  expect(facet?.native).toEqual(expect.objectContaining({ count: 18 }));
});

test("a boolean facet comes back as booleans rather than as their spelling", async () => {
  const adapter = adapterFor(createProductDatabase());

  const response = await run(adapter, { facets: ["inStock"] });

  expect(response.facets["inStock"]?.values).toEqual([
    { value: true, count: 4 },
    { value: false, count: 2 },
  ]);
});

test("a number facet is refused rather than counted into invented ranges", async () => {
  const adapter = adapterFor(createProductDatabase());

  await expect(run(adapter, { facets: ["price"] })).rejects.toThrowError(
    /counts a number property into ranges/,
  );
});

test("highlights are declared absent and every hit carries an empty record", async () => {
  const adapter = adapterFor(createProductDatabase());

  const response = await run(adapter, { query: "headphones" });

  expect(adapter.capabilities.highlights).toBe("none");
  expect(response.hits).toHaveLength(2);
  for (const hit of response.hits) {
    expect(hit.highlights).toEqual({});
  }
});

test("every hit keeps Orama's own result, including its score", async () => {
  const adapter = adapterFor(createProductDatabase());

  const response = await run(adapter, { query: "headphones" });
  const first = response.hits[0];

  expect(first?.native.score).toBeGreaterThan(0);
  expect(first?.native.document).toBe(first?.document);
  expect(response.native?.count).toBe(2);
});

test("the reported time is Orama's own measurement, converted to milliseconds", async () => {
  const adapter = adapterFor(createProductDatabase());

  const response = await run(adapter);
  const raw = response.native?.elapsed?.raw;

  expect(typeof raw).toBe("number");
  expect(response.took).toBe(Number(raw) / NANOSECONDS_PER_MILLISECOND);
});

test("a profile narrows which properties Orama reads", async () => {
  const adapter = adapterFor(createProductDatabase());

  const wide = await run(adapter, { query: "cancelling", profile: "default" });
  const narrow = await run(adapter, { query: "cancelling", profile: "names" });

  expect(ids(wide)).toEqual(["p1"]);
  expect(narrow.hits).toHaveLength(0);
});

test("a profile can forgive a misspelled term", async () => {
  const adapter = adapterFor(createProductDatabase());

  const strict = await run(adapter, { query: "headphnes", profile: "default" });
  const forgiving = await run(adapter, {
    query: "headphnes",
    profile: "forgiving",
  });

  expect(strict.hits).toHaveLength(0);
  expect(sortedIds(forgiving)).toEqual(["p1", "p2"]);
});

// A name reaching the adapter is one its index declared, so a gap is a hole in
// this adapter's configuration rather than something Orama cannot do. That is a
// configuration error, the same one every other adapter raises for it.
test("a sort the adapter was not configured with is a configuration error", async () => {
  const adapter = adapterFor(createProductDatabase());

  const failure = run(adapter, { sort: "nameAsc" });

  await expect(failure).rejects.toThrowError(SearchConfigurationError);
  await expect(failure).rejects.toThrowError(/no nameAsc entry in its sorts/);
  await expect(failure).rejects.toMatchObject({ path: "sorts.nameAsc" });
});

test("a profile the adapter was not configured with is a configuration error", async () => {
  const adapter = adapterFor(createProductDatabase());

  const failure = run(adapter, { profile: "fuzzy" });

  await expect(failure).rejects.toThrowError(SearchConfigurationError);
  await expect(failure).rejects.toThrowError(/no fuzzy entry in its profiles/);
  await expect(failure).rejects.toMatchObject({ path: "profiles.fuzzy" });
});

test("the answer is a promise even though Orama answered synchronously", async () => {
  const adapter = adapterFor(createProductDatabase());

  const answer = adapter.search(request(), {
    signal: new AbortController().signal,
  });

  expect(answer).toBeInstanceOf(Promise);
  await answer;
});

test("a multi-byte term matches the document that carries it", async () => {
  const adapter = adapterFor(createProductDatabase());

  const response = await run(adapter, { query: "Café" });

  expect(ids(response)).toEqual(["p5"]);
});

test("disposal leaves the borrowed database usable", async () => {
  const db = createProductDatabase();
  const first = adapterFor(db);
  const second = adapterFor(db);

  first.dispose();
  const response = await run(second);

  expect(response.hits).toHaveLength(6);
});
