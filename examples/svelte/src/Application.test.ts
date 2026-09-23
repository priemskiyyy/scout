import { fireEvent, waitFor, within } from "@testing-library/dom";
import { QueryClient } from "@tanstack/svelte-query";
import { flushSync, mount, unmount } from "svelte";
import { afterEach, expect, test } from "vitest";

import { QUERY_DEFAULTS } from "examples/shared/outpost/constants/queryDefaults";
import { PRODUCTS } from "examples/shared/outpost/constants/products";
import { startOutpost } from "examples/shared/outpost/utils/startOutpost";
import Application from "src/Application.svelte";

const disposals: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const dispose of disposals.splice(0)) {
    await dispose();
  }
});

const mountApplication = () => {
  const { outpost, runtime } = startOutpost({ latency: 0 });

  // A failed engine is retried at once, so a test never waits out a backoff.
  const queryClient = new QueryClient({
    defaultOptions: {
      ...QUERY_DEFAULTS,
      queries: { ...QUERY_DEFAULTS.queries, retryDelay: 0 },
    },
  });

  const target = document.createElement("div");

  document.body.append(target);

  const application = mount(Application, {
    target,
    props: { outpost, runtime, queryClient },
  });

  // Effects run after mount, and unmounting tears down only what has run.
  flushSync();

  disposals.push(async () => {
    await unmount(application);
    target.remove();
    queryClient.clear();
    runtime.dispose();
  });

  const view = within(target);

  const press = (name: string) => {
    fireEvent.click(view.getByRole("button", { name }));
    flushSync();
  };

  const store = () =>
    within(view.getByRole("region", { name: "Outpost store" }));

  const results = () => within(store().getByRole("list", { name: "Results" }));

  return { view, press, store, results };
};

test("tent on your API answers with its seven products, highlighted", async () => {
  const { view, store, results } = mountApplication();

  await waitFor(() => {
    expect(results().getAllByRole("listitem")).toHaveLength(7);
  });

  expect(store().getByText("7 results")).toBeTruthy();

  const ridgeline = results().getByRole("listitem", {
    name: "Ridgeline 2 tent",
  });

  const description = PRODUCTS.find(
    (product) => product.id === "p01",
  )?.description;

  // The parts rejoin into the very text, with the match marked in it.
  expect(ridgeline.querySelector("p")?.textContent?.trim()).toBe(description);
  expect(
    Array.from(ridgeline.querySelectorAll("mark"), (mark) => mark.textContent),
  ).toEqual(["tent", "tent"]);
  expect(
    within(view.getByRole("region", { name: "Latest search" })).getByLabelText(
      "The search, as code",
    ).textContent,
  ).toContain('.search("tent")');
});

test("MiniSearch refuses facet counts and highlights, and the store searches without them", async () => {
  const { view, press, results } = mountApplication();

  await waitFor(() => {
    expect(results().getAllByRole("listitem")).toHaveLength(7);
  });

  press("MiniSearch");

  await waitFor(() => {
    expect(view.getByRole("alert").textContent).toContain(
      "MiniSearch refused this search",
    );
  });

  press("Search without facet counts");

  await waitFor(() => {
    expect(
      view.getByRole("button", { name: "Search without highlights" }),
    ).toBeTruthy();
  });

  expect(
    view.queryByRole("button", { name: "Search without facet counts" }),
  ).toBeNull();

  press("Search without highlights");

  await waitFor(() => {
    expect(results().getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  expect(view.queryByRole("alert")).toBeNull();
});
