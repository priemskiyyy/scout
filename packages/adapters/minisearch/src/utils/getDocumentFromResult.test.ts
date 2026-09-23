import { expect, test } from "vitest";

import {
  createProductIndex,
  PRODUCTS,
  resolveProduct,
} from "src/minisearch.fixture";
import { getDocumentFromResult } from "src/utils/getDocumentFromResult";

const getResult = (options: { storeFields?: readonly string[] } = {}) => {
  const [result] = createProductIndex(options).search("running");

  if (result === undefined) {
    throw new Error("The corpus has no running shoe.");
  }

  return result;
};

test("stored fields and the id are the document when every schema field is stored", () => {
  expect(getDocumentFromResult(getResult(), undefined)).toEqual(PRODUCTS[0]);
});

test("a resolver builds the document from the id and the stored subset", () => {
  const seen: unknown[] = [];

  const document = getDocumentFromResult(
    getResult({ storeFields: ["title"] }),
    (id, stored) => {
      seen.push({ id, stored });

      return resolveProduct(id);
    },
  );

  expect(document).toEqual(PRODUCTS[0]);
  expect(seen).toEqual([{ id: "p1", stored: { title: "Running shoe" } }]);
});

test("an instance that stores nothing and has no resolver says so itself", () => {
  expect(() =>
    getDocumentFromResult(getResult({ storeFields: [] }), undefined),
  ).toThrowError(
    expect.objectContaining({
      code: "configuration",
      message:
        "MiniSearch stored no fields for document p1. A result carries only the fields in storeFields, so list every schema field there or pass resolve to build the document.",
    }),
  );
});
