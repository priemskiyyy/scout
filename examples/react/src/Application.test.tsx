import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { QUERY_DEFAULTS } from "examples/shared/outpost/constants/queryDefaults";
import { startOutpost } from "examples/shared/outpost/utils/startOutpost";
import type { OutpostRuntime } from "examples/shared/outpost/types/OutpostRuntime";
import { Application } from "src/Application";

class IntersectionObserverStub {
  observe() {}

  disconnect() {}
}

const runtimes: OutpostRuntime[] = [];

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
});

afterEach(() => {
  cleanup();

  for (const runtime of runtimes.splice(0)) {
    runtime.dispose();
  }

  vi.unstubAllGlobals();
});

const renderApplication = (latency = 0) => {
  const started = startOutpost({ latency });

  runtimes.push(started.runtime);

  // The page's own defaults, without the wait before a retry.
  const queryClient = new QueryClient({
    defaultOptions: {
      ...QUERY_DEFAULTS,
      queries: { ...QUERY_DEFAULTS.queries, retryDelay: 0 },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <Application outpost={started.outpost} runtime={started.runtime} />
    </QueryClientProvider>,
  );

  return started;
};

const readStore = () => screen.getByRole("region", { name: "Outpost store" });

const readLatestSearch = () =>
  screen.getByRole("region", { name: "Latest search" });

const press = (name: string) => {
  fireEvent.click(within(readStore()).getByRole("button", { name }));
};

const waitForResults = () =>
  within(readStore()).findByRole("list", { name: "Results" });

const waitForProblem = () => within(readStore()).findByRole("alert");

test("Outpost opens on your API with the seven tents, and the code that found them", async () => {
  renderApplication();

  const results = await waitForResults();

  expect(within(results).getAllByRole("listitem")).toHaveLength(7);
  expect(
    within(results).getByRole("listitem", { name: "Ridgeline 2 tent" }),
  ).toBeTruthy();
  expect(within(readStore()).getByText("7 results")).toBeTruthy();

  const code = within(readLatestSearch()).getByLabelText("The search, as code");

  expect(code.textContent).toContain('scout.index("api")');
  expect(code.textContent).toContain('.search("tent")');
  expect(
    within(readLatestSearch()).getByText("Every match was counted."),
  ).toBeTruthy();
});

test("a highlight is parts: the matched run is a mark, never markup", async () => {
  renderApplication();

  const results = await waitForResults();

  const ridgeline = within(results).getByRole("listitem", {
    name: "Ridgeline 2 tent",
  });

  expect(
    Array.from(ridgeline.querySelectorAll("mark"), (mark) => mark.textContent),
  ).toContain("tent");
});

test("MiniSearch refuses facet counts and highlights, and the store searches without them on request", async () => {
  renderApplication();
  await waitForResults();

  fireEvent.click(
    within(
      within(readStore()).getByRole("group", { name: "Engine" }),
    ).getByRole("button", { name: "MiniSearch" }),
  );

  expect((await waitForProblem()).textContent).toContain(
    "MiniSearch refused this search",
  );

  press("Search without facet counts");

  await waitFor(() => {
    expect(within(readStore()).getByRole("alert").textContent).toContain(
      "highlight parts could only be guessed",
    );
  });

  press("Search without highlights");

  expect(
    within(await waitForResults()).getAllByRole("listitem").length,
  ).toBeGreaterThan(0);
});

test("your API offline fails as provider, with its 503 kept as the cause", async () => {
  const { outpost } = renderApplication();

  await waitForResults();
  outpost.backend.update({ offline: true });

  const problem = await waitForProblem();

  expect(problem.textContent).toContain("Your API failed");
  expect(problem.textContent).toContain("503 Service Unavailable");
  expect(problem.textContent).toContain("provider");
});

test("an empty set is answered by Scout, and your API receives nothing", async () => {
  const { outpost } = renderApplication();

  await waitForResults();

  const sent = outpost.backend.requests.getSnapshot().length;

  fireEvent.click(screen.getByRole("button", { name: "Ask for an empty set" }));

  expect(
    await within(readStore()).findByText("Nothing can match"),
  ).toBeTruthy();
  expect(outpost.backend.requests.getSnapshot()).toHaveLength(sent);
  expect(
    within(readLatestSearch()).getByText(
      "None: Scout answered without asking the engine",
    ),
  ).toBeTruthy();
});

test("a hostile document's markup reaches the page as text", async () => {
  const { outpost } = renderApplication();

  await waitForResults();
  outpost.backend.update({ hostileDocument: true });

  const results = await waitForResults();

  await waitFor(() => {
    expect(within(results).getAllByRole("listitem")).toHaveLength(8);
  });
  expect(results.textContent).toContain('<img src=x onerror="alert(1)">');
  expect(results.querySelector("img")).toBeNull();
  expect(results.querySelector("script")).toBeNull();
});

test("Stop aborts the search in flight, and your API stops working on it", async () => {
  const { outpost } = renderApplication(5_000);

  press("Stop");

  const problem = await waitForProblem();

  expect(problem.textContent).toContain("You stopped this search");
  await waitFor(() => {
    expect(outpost.backend.requests.getSnapshot()[0]?.outcome).toBe("aborted");
  });
});

test("going back to a search answers from the cache, without asking your API again", async () => {
  const { outpost } = renderApplication();

  await waitForResults();

  const search = within(readStore()).getByRole("searchbox", {
    name: "Search the store",
  });

  fireEvent.change(search, { target: { value: "winter" } });
  await within(readStore()).findByText("5 results");

  const sent = outpost.backend.requests.getSnapshot().length;

  fireEvent.change(search, { target: { value: "tent" } });
  await within(readStore()).findByText("7 results");

  // A stale entry would answer at once and refetch behind it, so wait for
  // everything in flight before counting.
  await within(readStore()).findByText("fetching 0");

  expect(outpost.backend.requests.getSnapshot()).toHaveLength(sent);
});
