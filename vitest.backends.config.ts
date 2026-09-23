import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Only the adapters with a backend test, each against the engine the runner in
// scripts/test-backends.mjs started for it. Seeding a real engine and waiting
// for its index to be ready takes longer than any unit test.
const adapters = readdirSync(
  new URL("./packages/adapters", import.meta.url),
).filter((name) =>
  existsSync(
    new URL(
      `./packages/adapters/${name}/src/${name}.backend.test.ts`,
      import.meta.url,
    ),
  ),
);

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    restoreMocks: true,
    testTimeout: 30_000,
    hookTimeout: 240_000,
    projects: adapters.map((name) => ({
      resolve: {
        alias: {
          src: fileURLToPath(
            new URL(`./packages/adapters/${name}/src`, import.meta.url),
          ),
        },
      },
      test: {
        name,
        include: [`packages/adapters/${name}/src/**/*.backend.test.ts`],
        environment: "node",
        testTimeout: 30_000,
        hookTimeout: 240_000,
      },
    })),
  },
});
