import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@solidjs/testing-library";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { afterEach, expect, test } from "vitest";

import { QUERY_DEFAULTS } from "examples/shared/outpost/constants/queryDefaults";
import type { OutpostRuntime } from "examples/shared/outpost/types/OutpostRuntime";
import { startOutpost } from "examples/shared/outpost/utils/startOutpost";
import { Application } from "src/Application";

const runtimes: OutpostRuntime[] = [];

afterEach(() => {
  cleanup();

  for (const runtime of runtimes.splice(0)) {
    runtime.dispose();
  }
});

const renderApplication = () => {
  const { outpost, runtime } = startOutpost({ latency: 0 });

  runtimes.push(runtime);

  const queryClient = new QueryClient({
    defaultOptions: {
      ...QUERY_DEFAULTS,
      queries: { ...QUERY_DEFAULTS.queries, retryDelay: 0 },
    },
  });

  render(() => (
    <QueryClientProvider client={queryClient}>
      <Application outpost={outpost} runtime={runtime} />
    </QueryClientProvider>
  ));
};

const readStore = () => screen.getByRole("region", { name: "Outpost store" });

const waitForResults = () =>
  waitFor(() => {
    expect(
      within(readStore()).getByRole("list", { name: "Results" }),
    ).toBeTruthy();
  });

const readResultNames = () =>
  within(within(readStore()).getByRole("list", { name: "Results" }))
    .getAllByRole("listitem")
    .map((item) => item.getAttribute("aria-label"));

test("tent on your API answers seven exact results, the Ridgeline 2 tent among them", async () => {
  renderApplication();

  await waitForResults();

  expect(readResultNames()).toHaveLength(7);
  expect(readResultNames()).toContain("Ridgeline 2 tent");
  expect(within(readStore()).getByText("7 results")).toBeTruthy();
  expect(
    within(
      screen.getByRole("region", { name: "Latest search" }),
    ).getByLabelText("The search, as code").textContent,
  ).toContain('.search("tent")');
});

test("MiniSearch refuses facet counts and highlights, and the store searches again without them", async () => {
  renderApplication();

  await waitForResults();

  fireEvent.click(screen.getByRole("button", { name: "MiniSearch" }));

  const refusal = await screen.findByRole("alert");

  expect(refusal.textContent).toContain("MiniSearch refused this search");

  fireEvent.click(
    within(refusal).getByRole("button", {
      name: "Search without facet counts",
    }),
  );

  // Without facets MiniSearch still cannot highlight, so it refuses again.
  await waitFor(() => {
    expect(
      screen.queryByRole("button", { name: "Search without facet counts" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Search without highlights" }),
    ).toBeTruthy();
  });

  fireEvent.click(
    screen.getByRole("button", { name: "Search without highlights" }),
  );

  await waitForResults();

  expect(readResultNames()).toContain("Ridgeline 2 tent");
  expect(screen.queryByRole("alert")).toBeNull();
});
