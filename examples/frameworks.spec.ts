import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const EXAMPLES = [
  { name: "Vue", url: "http://127.0.0.1:4481/" },
  { name: "Solid", url: "http://127.0.0.1:4482/" },
  { name: "Svelte", url: "http://127.0.0.1:4483/" },
];

const WIDTHS = [375, 1280];

const store = (page: Page) =>
  page.getByRole("region", { name: "Outpost store" });

const open = async (page: Page, url: string, width: number) => {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url);
  await expect(store(page).getByText("7 results")).toBeVisible();

  return errors;
};

const hasHorizontalScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

for (const { name, url } of EXAMPLES) {
  for (const width of WIDTHS) {
    test(`${name} searches the store without errors or horizontal scroll at ${width}px`, async ({
      page,
    }) => {
      const errors = await open(page, url, width);

      await expect(
        store(page)
          .getByRole("list", { name: "Results" })
          .getByRole("listitem", { name: "Ridgeline 2 tent" }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("region", { name: "Latest search" })
          .getByLabel("The search, as code"),
      ).toContainText('.search("tent")');
      await expect(hasHorizontalScroll(page)).resolves.toBe(false);
      expect(errors).toEqual([]);
    });
  }

  test(`${name} shows MiniSearch refusing, and searches without what it refused`, async ({
    page,
  }) => {
    await open(page, url, 1280);
    await store(page)
      .getByRole("group", { name: "Engine" })
      .getByRole("button", { name: "MiniSearch" })
      .click();

    await expect(store(page).getByRole("alert")).toContainText(
      "MiniSearch refused this search",
    );

    await store(page)
      .getByRole("button", { name: "Search without facet counts" })
      .click();
    await store(page)
      .getByRole("button", { name: "Search without highlights" })
      .click();

    await expect(
      store(page).getByRole("list", { name: "Results" }).getByRole("listitem"),
    ).not.toHaveCount(0);
  });

  test(`${name} links the Outpost favicon`, async ({ page }) => {
    await open(page, url, 1280);

    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      "href",
      /%23b45309/,
    );
  });
}
