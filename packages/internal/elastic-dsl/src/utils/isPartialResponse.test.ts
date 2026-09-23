import { expect, test } from "vitest";

import { isPartialResponse } from "src/utils/isPartialResponse";

const BODY = {
  took: 1,
  timed_out: false,
  _shards: { failed: 0 },
  hits: { hits: [] },
};

test("an answer from every shard, in time, is whole", () => {
  expect(isPartialResponse(BODY)).toBe(false);
});

test("an answer cut off by its timeout is partial", () => {
  expect(isPartialResponse({ ...BODY, timed_out: true })).toBe(true);
});

test("an answer missing a failed shard is partial", () => {
  expect(isPartialResponse({ ...BODY, _shards: { failed: 1 } })).toBe(true);
});
