import { expect, test } from "vitest";

import { createMockSearchAdapter } from "src/mock/createMockSearchAdapter";
import { index } from "src/utils/defineIndex";
import { ProductSchema, product } from "src/utils/internal/testSchema.fixture";
import {
  createTestScout,
  getAnswer,
  productIndex,
} from "src/utils/internal/testScout.fixture";
import { Scout } from "src/utils/Scout";
import { ScoutError } from "src/utils/ScoutError";

const getConstructionError = (build: () => unknown) => {
  try {
    build();
  } catch (error) {
    return error;
  }

  throw new Error("The Scout was built.");
};

test("an index with no adapter is refused, naming where the adapter goes", () => {
  const error = getConstructionError(
    () =>
      // @ts-expect-error the products index has no adapter
      new Scout({ indexes: { products: productIndex }, adapters: {} }),
  );

  expect(error).toBeInstanceOf(ScoutError);
  expect(error).toMatchObject({
    code: "configuration",
    message:
      'The index "products" has no adapter. Add one under adapters.products.',
  });
});

test("an adapter that serves no index is refused, naming the indexes", () => {
  const { adapter } = createMockSearchAdapter();

  expect(
    () =>
      new Scout({
        indexes: { products: productIndex },
        // @ts-expect-error orders serves no index
        adapters: { products: adapter, orders: adapter },
      }),
  ).toThrowError(
    'adapters.orders serves no index. The indexes are "products".',
  );
});

test("an adapter that serves sorts through its own configuration covers every declared one", () => {
  const { adapter } = createMockSearchAdapter({
    sorts: { priceAsc: "products_price_asc" },
  });

  expect(
    () =>
      new Scout({
        indexes: { products: productIndex },
        adapters: { products: adapter },
      }),
  ).toThrowError(
    "The adapter for products serves sorts through configuration of its own and has none for cheapestNamed. Add cheapestNamed to its sorts.",
  );
});

test("a sort or profile the adapter configures but the index never declared is refused", () => {
  const sorts = createMockSearchAdapter({
    sorts: { priceAsc: "a", cheapestNamed: "b", newest: "c" },
  });

  const profiles = createMockSearchAdapter({ profiles: { titles: {} } });

  expect(
    () =>
      new Scout({
        indexes: { products: productIndex },
        adapters: { products: sorts.adapter },
      }),
  ).toThrowError(
    'The adapter for products configures sorts.newest, which the index does not declare. The index declares "relevance", "priceAsc", "cheapestNamed".',
  );
  expect(
    () =>
      new Scout({
        indexes: { products: productIndex },
        adapters: { products: profiles.adapter },
      }),
  ).toThrowError(
    'The adapter for products configures profiles.titles, which the index does not declare. The index declares "default", "names".',
  );
});

test("an index handle is cached, frozen and reaches the adapter's native client", () => {
  const { scout, mock } = createTestScout();
  const products = scout.index("products");

  expect(scout.index("products")).toBe(products);
  expect(Object.isFrozen(products)).toBe(true);
  expect(products.name).toBe("products");
  expect(products.native).toBe(mock.adapter.native);
});

test("an unknown index name names the ones that exist, quoted", () => {
  const { scout } = createTestScout();

  // The compiler refuses this. A JavaScript caller, or a name built at
  // runtime, still reaches the guard. The names are quoted because one can be
  // empty or carry spaces.
  // @ts-expect-error there is no index called nope
  expect(() => scout.index("nope")).toThrowError(
    'There is no index named "nope". The declared indexes are "products".',
  );
});

test("a Scout with no indexes says so", () => {
  const scout = new Scout({ indexes: {}, adapters: {} });

  // @ts-expect-error there is no index at all on this Scout
  expect(() => scout.index("products")).toThrowError(
    'There is no index named "products". This Scout declares no indexes.',
  );
});

test("replacing an entry in the supplied maps cannot reroute an existing Scout", async () => {
  const original = createMockSearchAdapter({
    response: getAnswer([product({ id: "original" })]),
  });

  const replacement = createMockSearchAdapter({
    response: getAnswer([product({ id: "replacement" })]),
  });

  const adapters = { products: original.adapter };
  const scout = new Scout({ indexes: { products: productIndex }, adapters });

  adapters.products = replacement.adapter;

  const result = await scout.index("products").search("shoe").execute();

  expect(result.hits.map((hit) => hit.id)).toEqual(["original"]);
  expect(replacement.requests).toHaveLength(0);
});

test("disposal disposes every adapter once, however often it is called", () => {
  const { scout, mock } = createTestScout();

  scout.dispose();
  scout.dispose();

  expect(mock.disposals()).toBe(1);
});

test("a disposed Scout refuses new searches without reaching the adapter", async () => {
  const { scout, mock, products } = createTestScout();

  scout.dispose();

  await expect(products.search("shoe").execute()).rejects.toMatchObject({
    code: "disposed",
  });
  expect(mock.requests).toHaveLength(0);
});

test("disposal continues after a failing adapter and rethrows its error", () => {
  const { adapter } = createMockSearchAdapter();
  const healthy = createMockSearchAdapter();
  const failure = new Error("first cleanup failed");

  const failing = {
    ...adapter,
    dispose: () => {
      throw failure;
    },
  };

  const scout = new Scout({
    indexes: { first: productIndex, second: productIndex },
    adapters: { first: failing, second: healthy.adapter },
  });

  expect(() => scout.dispose()).toThrow(failure);
  expect(healthy.disposals()).toBe(1);
  expect(() => scout.dispose()).not.toThrow();
});

test("several disposal failures are collected in index order", () => {
  const { adapter } = createMockSearchAdapter();
  const errors = [new Error("first"), new Error("second")];

  const getFailing = (error: unknown) => ({
    ...adapter,
    dispose: () => {
      throw error;
    },
  });

  const scout = new Scout({
    indexes: { first: productIndex, second: productIndex },
    adapters: { first: getFailing(errors[0]), second: getFailing(errors[1]) },
  });

  expect(() => scout.dispose()).toThrowError(
    expect.objectContaining({ name: "AggregateError", errors }),
  );
});

test("an adapter without dispose is simply not disposed", () => {
  const { adapter } = createMockSearchAdapter();

  const scout = new Scout({
    indexes: {
      products: index({
        schema: ProductSchema,
        id: (item) => item.id,
        searchable: ["name"],
      }),
    },
    adapters: { products: { ...adapter, dispose: undefined } },
  });

  expect(() => scout.dispose()).not.toThrow();
});
