import { expect, test, vi } from "vitest";

import { product } from "src/utils/internal/testSchema.fixture";
import {
  createTestScout,
  getAnswer,
} from "src/utils/internal/testScout.fixture";
import { ScoutError } from "src/utils/ScoutError";

const getRejection = async (pending: Promise<unknown>) => {
  try {
    await pending;
  } catch (error) {
    return error;
  }

  throw new Error("The search answered.");
};

test("a filter that can match nothing is answered without the engine", async () => {
  const { mock, products } = createTestScout();

  const result = await products
    .search("shoe")
    .where((fields) => fields.brand.in([]))
    .facets("brand")
    .execute();

  expect(mock.requests).toHaveLength(0);
  expect(result.hits).toEqual([]);
  expect(result.total).toEqual({
    value: 0,
    accuracy: "exact",
    scope: "matches",
  });
  expect(result.page.next).toBeNull();
  expect(result.facets.brand).toEqual({
    field: "brand",
    values: [],
    exhaustive: true,
    native: null,
  });
  expect(result.native).toBeNull();
});

test("a filter that restricts nothing reaches the adapter as no filter", async () => {
  const { mock, products } = createTestScout();

  await products
    .search("shoe")
    .where((fields) => fields.brand.notIn([]))
    .execute();

  expect(mock.requests[0]?.request.filter).toBeNull();
});

test("a refusal from the adapter reaches the caller unchanged", async () => {
  const refusal = new ScoutError({
    code: "unsupported-feature",
    message: "The engine cannot facet.",
  });

  const { products } = createTestScout({
    response: () => {
      throw refusal;
    },
  });

  await expect(products.search("shoe").execute()).rejects.toBe(refusal);
});

test("an engine failure becomes a provider error that keeps the cause", async () => {
  const cause = new Error("502 Bad Gateway");

  const { products } = createTestScout({
    response: () => {
      throw cause;
    },
  });

  const error = await getRejection(products.search("shoe").execute());

  expect(error).toBeInstanceOf(ScoutError);
  expect(error).toMatchObject({
    code: "provider",
    message: "The mock search of products failed.",
    cause,
  });
});

test("a search aborted before it starts never reaches the adapter", async () => {
  const { mock, products } = createTestScout();
  const controller = new AbortController();
  const reason = new Error("replaced");

  controller.abort(reason);

  await expect(
    products.search("shoe").execute({ signal: controller.signal }),
  ).rejects.toMatchObject({ code: "aborted", cause: reason });
  expect(mock.requests).toHaveLength(0);
});

test("an abort reaches the adapter's signal and settles without waiting for it", async () => {
  const { mock, products } = createTestScout({
    hold: true,
    ignoreSignal: true,
  });

  const controller = new AbortController();
  const reason = new Error("replaced");

  const pending = products
    .search("shoe")
    .execute({ signal: controller.signal });

  controller.abort(reason);

  await expect(pending).rejects.toMatchObject({
    code: "aborted",
    cause: reason,
  });
  expect(mock.requests[0]?.aborted()).toBe(true);
});

test("a late answer from an engine that ignored the abort is refused", async () => {
  const { mock, products } = createTestScout({
    hold: true,
    ignoreSignal: true,
  });

  const controller = new AbortController();

  const pending = products
    .search("shoe")
    .execute({ signal: controller.signal });

  controller.abort();
  mock.requests[0]?.settle(getAnswer([product()])());

  await expect(pending).rejects.toMatchObject({ code: "aborted" });
});

// The answer wins the race here, because it settled first, so only the check
// after the race stands between it and a caller who has gone.
test("an answer that lands in the same tick as the abort is refused", async () => {
  const { mock, products } = createTestScout({ hold: true });
  const controller = new AbortController();

  const pending = products
    .search("shoe")
    .execute({ signal: controller.signal });

  mock.requests[0]?.settle(getAnswer([product()])());
  controller.abort();

  await expect(pending).rejects.toMatchObject({ code: "aborted" });
});

// The SDK rejects with its own error once the signal fires. That is a
// cancellation, not a provider failure, and a consumer has to tell them apart.
test("an engine rejection caused by the abort is reported as the abort", async () => {
  const { mock, products } = createTestScout({
    hold: true,
    ignoreSignal: true,
  });

  const controller = new AbortController();
  const reason = new Error("replaced");

  const pending = products
    .search("shoe")
    .execute({ signal: controller.signal });

  controller.abort(reason);
  mock.requests[0]?.fail(new Error("The operation was aborted."));

  await expect(pending).rejects.toMatchObject({
    code: "aborted",
    cause: reason,
  });
});

test("disposal settles a search in flight without waiting for the engine", async () => {
  const { scout, mock, products } = createTestScout({
    hold: true,
    ignoreSignal: true,
  });

  const pending = products.search("shoe").execute();

  scout.dispose();

  await expect(pending).rejects.toMatchObject({ code: "disposed" });
  expect(mock.requests[0]?.aborted()).toBe(true);
});

test("an answer arriving after disposal is refused", async () => {
  const { scout, mock, products } = createTestScout({
    hold: true,
    ignoreSignal: true,
  });

  const pending = products.search("shoe").execute();

  scout.dispose();
  mock.requests[0]?.settle(getAnswer([product()])());

  await expect(pending).rejects.toMatchObject({ code: "disposed" });
});

test("an answer that lands in the same tick as disposal is refused", async () => {
  const { scout, mock, products } = createTestScout({ hold: true });
  const pending = products.search("shoe").execute();

  mock.requests[0]?.settle(getAnswer([product()])());
  scout.dispose();

  await expect(pending).rejects.toMatchObject({ code: "disposed" });
});

test("a completed search leaves the caller's signal as it found it", async () => {
  const { products } = createTestScout({ response: getAnswer([product()]) });
  const controller = new AbortController();
  const remove = vi.spyOn(controller.signal, "removeEventListener");

  await products.search("shoe").execute({ signal: controller.signal });

  expect(remove).toHaveBeenCalledOnce();
});

test("took reports the engine's own time when it gave one", async () => {
  const { products } = createTestScout({
    response: getAnswer([], { took: 7 }),
  });

  const result = await products.search("shoe").execute();

  expect(result.took).toEqual({ milliseconds: 7, source: "provider" });
});

// A wall clock steps backwards when it is corrected, which reported a search
// as taking a negative time. The measurement is monotonic instead.
test("took falls back to a monotonic measurement of Scout's own", async () => {
  const { products } = createTestScout({ response: getAnswer([]) });
  const stopped = Date.now();

  vi.spyOn(Date, "now").mockImplementation(() => stopped - 60_000);

  const result = await products.search("shoe").execute();

  expect(result.took.source).toBe("scout");
  expect(result.took.milliseconds).toBeGreaterThanOrEqual(0);
});
