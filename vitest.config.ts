import { svelte } from "@sveltejs/vite-plugin-svelte";
import vue from "@vitejs/plugin-vue";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";
import type { TestProjectConfiguration } from "vitest/config";

const project = (directory: string, name: string) =>
  ({
    extends: true,
    resolve: {
      alias: {
        src: fileURLToPath(
          new URL(`./${directory}/${name}/src`, import.meta.url),
        ),
      },
    },
    test: {
      name,
      include: [`${directory}/${name}/src/**/*.test.ts`],
      // A backend test needs a real engine, which only `pnpm test:backends`
      // starts.
      exclude: [...configDefaults.exclude, "**/*.backend.test.ts"],
      environment: "node",
    },
  }) satisfies TestProjectConfiguration;

const exampleAliases = (name: string) => ({
  src: fileURLToPath(new URL(`./examples/${name}/src`, import.meta.url)),
  "examples/shared": fileURLToPath(
    new URL("./examples/shared", import.meta.url),
  ),
});

// The examples are tested like applications: through their buttons, over the
// built packages they import by name. What they share is tested once, in node.
const exampleProjects: TestProjectConfiguration[] = [
  {
    extends: true,
    resolve: { alias: exampleAliases("shared") },
    test: {
      name: "example-shared",
      include: ["examples/shared/**/*.test.ts"],
      exclude: [...configDefaults.exclude],
      environment: "node",
    },
  },
  {
    extends: true,
    resolve: {
      alias: exampleAliases("react"),
      dedupe: ["react", "react-dom"],
    },
    test: {
      name: "example-react",
      include: ["examples/react/src/**/*.test.{ts,tsx}"],
      environment: "jsdom",
      // Node would load the icons with their own React; through Vite they share
      // the deduplicated one.
      server: { deps: { inline: ["@phosphor-icons/react"] } },
    },
  },
  {
    extends: true,
    plugins: [vue()],
    resolve: { alias: exampleAliases("vue"), dedupe: ["vue"] },
    test: {
      name: "example-vue",
      include: ["examples/vue/src/**/*.test.ts"],
      environment: "jsdom",
    },
  },
  {
    extends: true,
    plugins: [solid()],
    resolve: {
      alias: exampleAliases("solid"),
      conditions: ["development", "browser"],
      dedupe: ["solid-js"],
    },
    test: {
      name: "example-solid",
      include: ["examples/solid/src/**/*.test.{ts,tsx}"],
      environment: "jsdom",
      server: { deps: { inline: [/solid-js/, /@solidjs\/testing-library/] } },
    },
  },
  {
    extends: true,
    plugins: [svelte({ configFile: false })],
    resolve: { alias: exampleAliases("svelte"), conditions: ["browser"] },
    test: {
      name: "example-svelte",
      include: ["examples/svelte/src/**/*.test.ts"],
      environment: "jsdom",
      // svelte-query ships .svelte files, which only Vite can load.
      server: { deps: { inline: [/@tanstack\/svelte-query/] } },
    },
  },
];

// Every adapter, and every private module adapters share, is an ordinary node
// project named after its folder, so a new one is tested without being listed
// here.
const getPackages = (directory: string) =>
  readdirSync(new URL(`./${directory}`, import.meta.url)).filter((name) =>
    existsSync(new URL(`./${directory}/${name}/package.json`, import.meta.url)),
  );

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    restoreMocks: true,
    projects: [
      project("packages", "core"),
      project("packages", "tanstack-query"),
      ...getPackages("packages/internal").map((name) =>
        project("packages/internal", name),
      ),
      ...getPackages("packages/adapters").map((name) =>
        project("packages/adapters", name),
      ),
      ...exampleProjects,
    ],
  },
});
