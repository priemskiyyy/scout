import { expect, test } from "vitest";

import { index } from "src/utils/defineIndex";
import { ProductSchema } from "src/utils/internal/testSchema.fixture";

test("the built-in sort and profile come first, and declared ones resolve to their fields", () => {
  const products = index({
    schema: ProductSchema,
    id: (product) => product.id,
    searchable: ["name", "brand"],
    sorts: { cheapestNamed: { price: "asc", name: "desc" } },
    profiles: { names: { searchable: ["name"] } },
  });

  expect(products.sorts).toEqual({
    relevance: null,
    cheapestNamed: {
      name: "cheapestNamed",
      by: [
        { field: "price", direction: "asc" },
        { field: "name", direction: "desc" },
      ],
    },
  });
  expect(products.profiles).toEqual({
    default: ["name", "brand"],
    names: ["name"],
  });
});

// The one rule the types cannot state, because `{}` is a valid object.
test("a sort that orders by nothing is refused", () => {
  expect(() =>
    index({
      schema: ProductSchema,
      id: (product) => product.id,
      searchable: ["name"],
      sorts: { nothing: {} },
    }),
  ).toThrowError(
    expect.objectContaining({
      code: "configuration",
      message: "sorts.nothing must order by at least one field.",
    }),
  );
});

test("a declaration and everything in it is frozen", () => {
  const products = index({
    schema: ProductSchema,
    id: (product) => product.id,
    searchable: ["name"],
    facetable: { brand: "string" },
  });

  expect(Object.isFrozen(products)).toBe(true);
  expect(Object.isFrozen(products.facetable)).toBe(true);
  expect(Object.isFrozen(products.profiles.default)).toBe(true);
});
