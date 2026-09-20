import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
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
      environment: "node",
    },
  }) satisfies TestProjectConfiguration;

const adapters = [
  "typesense",
  "algolia",
  "meilisearch",
  "orama",
  "minisearch",
  "http",
  "fuse",
] as const;

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    restoreMocks: true,
    projects: [
      project("packages", "core"),
      project("packages", "tanstack-query"),
      ...adapters.map((name) => project("packages/adapters", name)),
      project("examples", "react"),
    ],
  },
});
