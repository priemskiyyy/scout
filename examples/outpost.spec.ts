import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const WIDTHS = [375, 1280];

const open = async (page: Page, width: number) => {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/");
  await expect(store(page).getByText("7 results")).toBeVisible();

  return errors;
};

const store = (page: Page) =>
  page.getByRole("region", { name: "Outpost store" });

const hasHorizontalScroll = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

for (const width of WIDTHS) {
  test(`searches the store without errors or horizontal scroll at ${width}px`, async ({
    page,
  }, testInfo) => {
    const errors = await open(page, width);

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

    await page.screenshot({
      path: testInfo.outputPath(`outpost-${width}.png`),
      fullPage: true,
    });

    expect(errors).toEqual([]);
  });
}

test("MiniSearch refuses facet counts, and the store searches without them on request", async ({
  page,
}) => {
  await open(page, 1280);
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

test("a negated group translates for every dialect but Algolia", async ({
  page,
}) => {
  await open(page, 1280);

  const dialects = page.getByRole("region", { name: "Six more dialects" });

  await dialects.getByRole("button", { name: "A negated group" }).click();
  await dialects.getByRole("tab", { name: /Algolia/ }).click();

  await expect(dialects.getByRole("tabpanel")).toContainText(
    "Algolia refused before its client was called",
  );

  await dialects.getByRole("tab", { name: /Typesense/ }).click();

  await expect(dialects.getByLabel("What Typesense was handed")).toContainText(
    "brand:!=`Vester`",
  );
});

test("your API guessing its count makes the store say About", async ({
  page,
}) => {
  await open(page, 1280);
  await page
    .getByRole("region", { name: "What the numbers claim" })
    .getByRole("button", { name: "Roughly" })
    .click();

  await expect(store(page).getByText("About 10 results")).toBeVisible();
});

test("your API offline reaches the store as a provider error with its cause", async ({
  page,
}) => {
  await open(page, 1280);
  await page.getByRole("button", { name: "API offline" }).click();

  const problem = store(page).getByRole("alert");

  await expect(problem).toContainText("Your API failed");
  await expect(problem).toContainText("503 Service Unavailable");
  await expect(
    page.getByRole("region", { name: "Network" }).getByText("Failed").first(),
  ).toBeVisible();
});

test("the page links the Outpost favicon", async ({ page }) => {
  await open(page, 1280);

  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    /%23b45309/,
  );
});
