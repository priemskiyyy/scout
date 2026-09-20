import { expect, test } from "vitest";
import { SearchConfigurationError } from "src/errors/SearchConfigurationError";
import { resolveConfigured } from "src/generators/resolveConfigured";

const CONTEXT = { adapter: "acme", kind: "sorts" } as const;

test("a configured name resolves to its value", () => {
  expect(
    resolveConfigured({ priceAsc: { field: "price" } }, "priceAsc", CONTEXT),
  ).toEqual({ field: "price" });
});

// A sort that needs no provider options is configured as null, which is a
// configured name and not a missing one.
test("a configured null is an answer rather than a gap", () => {
  expect(
    resolveConfigured({ relevance: null }, "relevance", CONTEXT),
  ).toBeNull();
});

// The name reaching an adapter is a name its index declared, so a gap is a
// mistake in the adapter's configuration rather than a missing engine feature.
test("a missing name is a configuration error naming what was configured", () => {
  const resolve = () =>
    resolveConfigured({ relevance: null, newest: null }, "priceAsc", CONTEXT);

  expect(resolve).toThrowError(SearchConfigurationError);
  expect(resolve).toThrowError(
    "The acme adapter has no priceAsc entry in its sorts. It was configured with relevance, newest.",
  );
});

test("the error points at the entry that is missing", () => {
  try {
    resolveConfigured({}, "default", { adapter: "acme", kind: "profiles" });
    expect.unreachable("resolveConfigured answered a name it was never given.");
  } catch (error) {
    expect(error).toBeInstanceOf(SearchConfigurationError);
    expect(error).toMatchObject({
      path: "profiles.default",
      code: "configuration",
    });
  }
});

test("an empty configuration says so rather than listing nothing", () => {
  expect(() => resolveConfigured({}, "relevance", CONTEXT)).toThrowError(
    "It was configured with nothing.",
  );
});

test("an inherited object property is not a configured name", () => {
  for (const name of ["constructor", "toString", "__proto__"]) {
    expect(() => resolveConfigured({}, name, CONTEXT)).toThrowError(
      SearchConfigurationError,
    );
  }
});
