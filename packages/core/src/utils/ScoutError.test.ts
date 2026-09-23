import { expect, test } from "vitest";

import { ScoutError } from "src/utils/ScoutError";

test("a Scout error is an Error with a code, a name and a cause", () => {
  const cause = new Error("502 Bad Gateway");

  const error = new ScoutError({
    code: "provider",
    message: "The search failed.",
    cause,
  });

  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe("ScoutError");
  expect(error.code).toBe("provider");
  expect(error.message).toBe("The search failed.");
  expect(error.cause).toBe(cause);
});

// An absent cause and an undefined one read differently to a logger that
// prints every own property.
test("without a cause there is no cause property at all", () => {
  const error = new ScoutError({ code: "configuration", message: "Wrong." });

  expect(Object.hasOwn(error, "cause")).toBe(false);
});
