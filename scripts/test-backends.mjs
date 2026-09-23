// The remote adapters against the real engines they translate for. Each
// engine is started alone, seeded by its adapter's backend test, tested and
// removed, so the run fits in a CI runner's memory. Docker is all it needs,
// which is why it stays out of `pnpm check`.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const COMPOSE = "scripts/backends/compose.yaml";
const READY_TIMEOUT = 240_000;

const isAnswering = async (url) => {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
};

// Where each engine answers once it can take a search. MongoDB has no HTTP
// endpoint, so its backend test waits on the driver instead.
const ENGINES = {
  typesense: {
    env: { TYPESENSE_URL: "http://localhost:8108" },
    isReady: () => isAnswering("http://localhost:8108/health"),
  },
  meilisearch: {
    env: { MEILISEARCH_URL: "http://localhost:7700" },
    isReady: () => isAnswering("http://localhost:7700/health"),
  },
  elasticsearch: {
    env: { ELASTICSEARCH_URL: "http://localhost:9200" },
    isReady: () =>
      isAnswering(
        "http://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=1s",
      ),
  },
  opensearch: {
    env: { OPENSEARCH_URL: "http://localhost:9201" },
    isReady: () =>
      isAnswering(
        "http://localhost:9201/_cluster/health?wait_for_status=yellow&timeout=1s",
      ),
  },
  mongodb: {
    env: { MONGODB_URL: "mongodb://localhost:27017/?directConnection=true" },
    isReady: async () => true,
  },
};

const run = (command, args, env = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });

  return result.status === 0;
};

const waitUntilReady = async (name, isReady) => {
  const deadline = Date.now() + READY_TIMEOUT;

  while (Date.now() < deadline) {
    if (await isReady()) {
      return;
    }

    await setTimeout(1_000);
  }

  throw new Error(`${name} did not come up within ${READY_TIMEOUT / 1_000}s.`);
};

// An engine is tested only when its adapter has a backend test to run.
const hasBackendTest = (name) =>
  existsSync(
    new URL(
      `../packages/adapters/${name}/src/${name}.backend.test.ts`,
      import.meta.url,
    ),
  );

const getNames = (requested) => {
  if (requested.length > 0) {
    return requested;
  }

  return Object.keys(ENGINES).filter(hasBackendTest);
};

const names = getNames(process.argv.slice(2));
const failed = [];

for (const name of names) {
  const engine = ENGINES[name];

  if (engine === undefined) {
    console.error(`There is no backend named ${name}.`);
    process.exit(1);
  }

  console.log(`\n== ${name}`);

  try {
    if (
      !run("docker", ["compose", "-f", COMPOSE, "up", "-d", "--wait", name])
    ) {
      throw new Error(`${name} did not start.`);
    }

    await waitUntilReady(name, engine.isReady);

    const passed = run(
      "node_modules/.bin/vitest",
      ["run", "--config", "vitest.backends.config.ts", "--project", name],
      engine.env,
    );

    if (!passed) {
      failed.push(name);
    }
  } catch (error) {
    console.error(String(error));
    failed.push(name);
  } finally {
    run("docker", ["compose", "-f", COMPOSE, "rm", "-sfv", name]);
  }
}

if (failed.length > 0) {
  console.error(`\nFailed against a real backend: ${failed.join(", ")}.`);
  process.exit(1);
}

console.log(
  `\nEvery adapter passed against its real backend: ${names.join(", ")}.`,
);
