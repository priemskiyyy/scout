import { insert } from "@orama/orama";
import { expect, test } from "vitest";

import { createProductDatabase, searchProducts } from "src/orama.fixture";
import { getFacetsFromResponse } from "src/utils/getFacetsFromResponse";

test("a facet reports every bucket it counted and says so", async () => {
  const response = await searchProducts(createProductDatabase(), {
    facets: { brand: {} },
  });

  expect(getFacetsFromResponse(response)).toEqual({
    brand: {
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
    },
  });
});

// Orama keys a bucket by the value's string. The core reads it as the type
// the index declared.
test("a boolean facet arrives as Orama's strings", async () => {
  const response = await searchProducts(createProductDatabase(), {
    facets: { inStock: {} },
  });

  expect(getFacetsFromResponse(response).inStock?.values).toEqual([
    { value: "true", count: 4 },
    { value: "false", count: 2 },
  ]);
});

test("a truncated facet says it was not exhaustive rather than looking whole", async () => {
  const db = createProductDatabase();

  for (let extra = 0; extra < 12; extra += 1) {
    insert(db, {
      id: `x${extra}`,
      name: `Gadget${extra}`,
      description: "Spare",
      brand: "Delta Home",
      category: "kitchen",
      price: 1,
      inStock: true,
    });
  }

  const facet = getFacetsFromResponse(
    await searchProducts(db, { facets: { name: {} } }),
  ).name;

  // Orama counts every distinct value of a string property and then returns
  // ten of them.
  expect(facet?.values).toHaveLength(10);
  expect(facet?.exhaustive).toBe(false);
  expect(facet?.native).toEqual(expect.objectContaining({ count: 18 }));
});

test("a response without facets has none", () => {
  expect(
    getFacetsFromResponse({
      count: 0,
      hits: [],
      elapsed: { raw: 1 },
    }),
  ).toEqual({});
});
