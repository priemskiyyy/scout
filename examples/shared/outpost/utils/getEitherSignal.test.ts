import { expect, test } from "vitest";

import { getEitherSignal } from "examples/shared/outpost/utils/getEitherSignal";

test("either signal aborting aborts the pair, with its own reason", () => {
  const first = new AbortController();
  const second = new AbortController();
  const either = getEitherSignal(first.signal, second.signal);

  expect(either.aborted).toBe(false);

  second.abort("stopped");

  expect(either.aborted).toBe(true);
  expect(either.reason).toBe("stopped");
});

test("a signal that already aborted aborts the pair at once", () => {
  const first = new AbortController();

  first.abort("gone");

  const either = getEitherSignal(first.signal, new AbortController().signal);

  expect(either.aborted).toBe(true);
  expect(either.reason).toBe("gone");
});
