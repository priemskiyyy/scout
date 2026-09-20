import { expect, test } from "vitest";
import { requestFor } from "src/utils/requestFor";

test("GET search parameters precede an endpoint fragment", () => {
  const request = requestFor(
    "GET",
    "https://example.test/search?tenant=shop#results",
    { q: "shoe" },
    {},
    new AbortController().signal,
  );
  expect(new URL(request.url).searchParams.get("q")).toBe("shoe");
  expect(new URL(request.url).hash).toBe("#results");
});
