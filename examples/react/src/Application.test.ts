import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";
import { Application } from "src/Application";

// JSX would need a `.tsx` test file, which the shared vitest project does not
// collect. `createElement` keeps this one runnable smoke test in place.
const render = () =>
  renderToString(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(Application),
    ),
  );

test("the whole page renders, so a broken component fails here and not in a browser", () => {
  const html = render();

  expect(html).toContain("Search playground");
  expect(html).toContain("headphones");
  expect(html).toContain("Orama");
  expect(html).toContain("MiniSearch");
  expect(html).toContain("Fuse.js");
  expect(html).toContain("Inspect query");
  expect(html).toContain("Clear search");
});
