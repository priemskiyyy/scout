import { expect, test } from "vitest";

import { createProductDatabase } from "src/orama.fixture";
import { getFacetDefinitionsFromFields } from "src/utils/getFacetDefinitionsFromFields";

const db = createProductDatabase();

test("every requested enum, string and boolean property is counted", () => {
  expect(
    getFacetDefinitionsFromFields(db.schema, ["brand", "name", "inStock"]),
  ).toEqual({ brand: {}, name: {}, inStock: {} });
});

test("a number property is refused rather than counted into invented ranges", () => {
  expect(() =>
    getFacetDefinitionsFromFields(db.schema, ["price"]),
  ).toThrowError(expect.objectContaining({ code: "unsupported-feature" }));
});

test("a property the schema never declared is a configuration error", () => {
  expect(() =>
    getFacetDefinitionsFromFields(db.schema, ["colour"]),
  ).toThrowError(
    expect.objectContaining({
      code: "configuration",
      message: "The Orama schema does not declare colour.",
    }),
  );
});
