import { UnsupportedSearchFeatureError } from "@priemskiyyy/scout";
import { expect, test } from "vitest";
import { ENGINES, productIndex } from "src/search";

// One search, written once, executed against every engine. Nothing here knows
// which engine answered, which is the whole claim the example makes.
const run = (engine: (typeof ENGINES)[number]) =>
  productIndex(engine)
    .search("headphones")
    .where((product, { and }) =>
      and(product.price.lte(700), product.inStock.eq(true)),
    )
    .pageSize(6);

test.each(ENGINES)("%s answers the same consumer code", async (engine) => {
  const result = await run(engine).execute();

  expect(result.hits.length).toBeGreaterThan(0);
  expect(result.total.accuracy).toBe("exact");
  expect(
    result.hits.every(
      (hit) => hit.document.price <= 700 && hit.document.inStock,
    ),
  ).toBe(true);
});

test("each engine has its own query identity, so a switch cannot reuse a cache entry", () => {
  expect(run("orama").key()).not.toEqual(run("minisearch").key());
});

test("orama reports facet buckets with counts", async () => {
  const result = await run("orama").facets("brand").execute();

  expect(result.facets.brand.values.length).toBeGreaterThan(0);
  expect(result.facets.brand.values[0]?.count).toBeGreaterThan(0);
});

test.each(["minisearch", "fuse"] as const)(
  "%s refuses the same faceted search instead of inventing counts",
  async (engine) => {
    await expect(run(engine).facets("brand").execute()).rejects.toThrowError(
      UnsupportedSearchFeatureError,
    );
  },
);
