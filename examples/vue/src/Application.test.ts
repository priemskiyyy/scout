import { fireEvent, waitFor, within } from "@testing-library/dom";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { afterEach, expect, test } from "vitest";

import { QUERY_DEFAULTS } from "examples/shared/outpost/constants/queryDefaults";
import { startOutpost } from "examples/shared/outpost/utils/startOutpost";
import Application from "src/Application.vue";

const disposals: (() => void)[] = [];

afterEach(() => {
  for (const dispose of disposals.splice(0)) {
    dispose();
  }
});

const mountApplication = () => {
  const { outpost, runtime } = startOutpost({ latency: 0 });

  // Retries wait for nothing here, so a test never sits out a backoff.
  const queryClient = new QueryClient({
    defaultOptions: {
      ...QUERY_DEFAULTS,
      queries: { ...QUERY_DEFAULTS.queries, retryDelay: 0 },
    },
  });

  const root = document.createElement("div");

  document.body.append(root);

  const wrapper = mount(Application, {
    props: { outpost, runtime },
    attachTo: root,
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  });

  disposals.push(() => {
    wrapper.unmount();
    root.remove();
    runtime.dispose();
    queryClient.clear();
  });

  return { page: within(root) };
};

type Page = ReturnType<typeof mountApplication>["page"];

const press = (page: Page, name: string) => {
  fireEvent.click(page.getByRole("button", { name }));
};

const readStore = (page: Page) =>
  within(page.getByRole("region", { name: "Outpost store" }));

const readResults = (page: Page) =>
  within(page.getByRole("list", { name: "Results" }));

test("tent on your API answers seven results, the Ridgeline 2 tent among them, with its match highlighted", async () => {
  const { page } = mountApplication();

  await waitFor(() => {
    expect(readStore(page).getByText("7 results")).toBeTruthy();
  });

  const tent = readResults(page).getByRole("listitem", {
    name: "Ridgeline 2 tent",
  });

  expect(tent.querySelector("mark")?.textContent).toBe("tent");
  expect(
    within(page.getByRole("region", { name: "Latest search" })).getByLabelText(
      "The search, as code",
    ).textContent,
  ).toContain('scout.index("api")');
});

test("MiniSearch refuses facet counts and highlights, and answers once the store asks for neither", async () => {
  const { page } = mountApplication();

  await waitFor(() => {
    expect(readStore(page).getByText("7 results")).toBeTruthy();
  });

  const engines = within(page.getByRole("group", { name: "Engine" }));

  fireEvent.click(engines.getByRole("button", { name: "MiniSearch" }));

  await waitFor(() => {
    expect(page.getByRole("alert").textContent).toContain(
      "MiniSearch refused this search",
    );
  });

  press(page, "Search without facet counts");

  // The last answer stands in while the next is pending, so the second
  // refusal is the one alert without the facet counts button.
  await waitFor(() => {
    expect(page.getByRole("alert").textContent).toContain(
      "MiniSearch refused this search",
    );
    expect(
      page.queryByRole("button", { name: "Search without facet counts" }),
    ).toBeNull();
  });

  press(page, "Search without highlights");

  await waitFor(() => {
    expect(
      readResults(page).getByRole("listitem", { name: "Ridgeline 2 tent" }),
    ).toBeTruthy();
  });

  expect(page.queryByRole("alert")).toBeNull();
});
