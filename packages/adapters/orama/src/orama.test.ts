import { insert, search } from "@orama/orama";
import { searchKey } from "@priemskiyyy/scout";
import type { AdapterSearchRequest } from "@priemskiyyy/scout";
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
