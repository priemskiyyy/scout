import { expect, test } from "vitest";
import { ScoutError } from "src/errors/ScoutError";
import { SearchAbortedError } from "src/errors/SearchAbortedError";
import { SearchConfigurationError } from "src/errors/SearchConfigurationError";
import { SearchDisposedError } from "src/errors/SearchDisposedError";
import { SearchProviderError } from "src/errors/SearchProviderError";
import { SearchValidationError } from "src/errors/SearchValidationError";
import { UnsupportedSearchFeatureError } from "src/errors/UnsupportedSearchFeatureError";

test("every error is a ScoutError and an Error, so one catch reaches all of them", () => {
  const errors = [
    new SearchValidationError({
      index: "products",
      issues: ["bad"],
      message: "m",
    }),
    new UnsupportedSearchFeatureError({
      adapter: "a",
      feature: "between",
      message: "m",
    }),
    new SearchProviderError({
      adapter: "a",
      message: "m",
      cause: new Error("boom"),
    }),
    new SearchAbortedError({
      adapter: "a",
      cancellation: "logical",
      message: "m",
    }),
    new SearchDisposedError({ index: "products", message: "m" }),
    new SearchConfigurationError({ path: "filter_by", message: "m" }),
  ];

  for (const error of errors) {
    expect(error).toBeInstanceOf(ScoutError);
    expect(error).toBeInstanceOf(Error);
  }
});

test("the name comes from the code, so a minified bundle still names the failure", () => {
  const error = new UnsupportedSearchFeatureError({
    adapter: "typesense",
    feature: "facets.resultScoped",
    message: "The typesense adapter does not report facets.",
  });

  expect(error.name).toBe("UnsupportedSearchFeatureError");
  expect(error.code).toBe("unsupported-feature");
  expect(error.adapter).toBe("typesense");
  expect(error.feature).toBe("facets.resultScoped");
});

test("a provider error keeps the original under cause rather than flattening it", () => {
  const provider = new Error("429 Too Many Requests");
  const error = new SearchProviderError({
    adapter: "algolia",
    message: "The algolia adapter could not complete the search.",
    cause: provider,
  });

  expect(error.cause).toBe(provider);
  expect(error.message).not.toContain("429");
});

test("an aborted search records whether the provider request was really cancelled", () => {
  const logical = new SearchAbortedError({
    adapter: "algolia",
    cancellation: "logical",
    message: "The search was abandoned.",
  });

  expect(logical.cancellation).toBe("logical");
});
