// Mutation checks require a green baseline and restore every changed file.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const MUTANTS = [
  {
    file: "packages/core/src/utils/internal/normalizeFilter.ts",
    find: 'return expression.operator === "in" ? MATCH_NONE : MATCH_ALL;',
    replace: 'return expression.operator === "in" ? MATCH_ALL : MATCH_NONE;',
    describes: "an empty in() matching everything instead of nothing",
  },
  {
    file: "packages/core/src/utils/internal/normalizeFilter.ts",
    find: "return decides ? MATCH_NONE : MATCH_ALL;",
    replace: "return decides ? MATCH_ALL : MATCH_NONE;",
    describes: "an empty or all-constant group collapsing the wrong way",
  },
  {
    file: "packages/core/src/utils/internal/normalizeFilter.ts",
    find: "return inner.value ? MATCH_NONE : MATCH_ALL;",
    replace: "return inner.value ? MATCH_ALL : MATCH_NONE;",
    describes: "a negated constant not inverting",
  },
  {
    file: "packages/core/src/utils/internal/normalizeFilter.ts",
    find: "for (const nested of child.expressions) {\n          remaining.push(nested);\n        }",
    replace: "remaining.push(child);",
    describes: "nested groups never flattening",
  },
  {
    file: "packages/core/src/utils/internal/normalizeFilter.ts",
    find: ".sort()",
    replace: "",
    describes: "set operands left in call order, so two equal filters differ",
  },
  {
    file: "packages/core/src/utils/internal/normalizeFilter.ts",
    find: 'const decides = expression.type === "or";',
    replace: 'const decides = expression.type === "and";',
    describes:
      "constant absorption inverted, so an or narrows instead of widening",
  },
  {
    file: "packages/core/src/utils/internal/normalizeFilter.ts",
    find: 'if (child.type === "constant") {',
    replace: 'if (child.type === "constant") {\n        remaining.push(child);',
    describes:
      "a neutral constant left inside its group for adapters to absorb",
  },
  {
    file: "packages/core/src/utils/internal/normalizeFilter.ts",
    find: "decided = true;",
    replace: "return decides ? MATCH_ALL : MATCH_NONE;",
    describes: "a deciding constant hiding a later invalid operand",
  },
  {
    file: "packages/core/src/utils/internal/canonicalize.ts",
    find: "Object.keys(value).sort()",
    replace: "Object.keys(value)",
    describes: "object keys left unsorted, so key order changes identity",
  },
  {
    file: "packages/core/src/utils/internal/canonicalize.ts",
    find: 'if (typeof value === "boolean") {\n    return String(value);\n  }',
    replace:
      'if (typeof value === "boolean") {\n    return value ? "1" : "0";\n  }',
    describes: "a boolean canonicalised as a number, colliding with 0 and 1",
  },
  {
    file: "packages/core/src/utils/splitHighlight.ts",
    find: "if (leaked || parts.length === 0) {",
    replace: "if (parts.length === 0) {",
    describes:
      "a leaked marker left in a part, so a document forges a highlight",
  },
  {
    file: "packages/core/src/generators/emptySearchResponse.ts",
    find: "{ field, values: [], exhaustive: true, native: null },",
    replace: '{ field, values: [], exhaustive: "unknown", native: null },',
    describes: "an empty result claiming its facet counts might be incomplete",
  },
  {
    file: "packages/core/src/utils/internal/canonicalize.ts",
    find: 'if (typeof member === "undefined") {\n        continue;\n      }',
    replace:
      'if (typeof member === "undefined") {\n        parts.push(`${JSON.stringify(key)}:null`);\n        continue;\n      }',
    describes: "an undefined member kept instead of omitted",
  },
  {
    file: "packages/adapters/typesense/src/typesense.ts",
    find: 'accuracy: response.search_cutoff === true ? "estimated" : "exact",',
    replace: 'accuracy: "exact",',
    describes: "a Typesense count cut short but still presented as exact",
  },
  {
    file: "packages/adapters/algolia/src/algolia.ts",
    find: "? response.page + 1\n      : request.page.current;",
    replace: "? response.page\n      : request.page.current;",
    describes: "Algolia zero based page passed through untranslated",
  },
];

// The package manager prints its own banner to stdout before the reporter
// does, so the report starts at the first brace rather than at the first byte.
const countFailures = (text) => {
  const start = text.indexOf('{"numTotalTestSuites"');
  if (start === -1) {
    return -1;
  }
  try {
    return JSON.parse(text.slice(start)).numFailedTests ?? -1;
  } catch {
    return -1;
  }
};

const projectOf = (file) => {
  const adapter = /packages\/adapters\/([^/]+)\//.exec(file);
  return adapter === null ? "core" : adapter[1];
};

const failingTests = (project) => {
  try {
    return countFailures(
      execFileSync(
        "node_modules/.bin/vitest",
        ["run", "--project", project, "--reporter", "json"],
        { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ),
    );
  } catch (error) {
    // A non-zero exit is the normal case for a caught mutant, so the report on
    // stdout still decides. Only an unparseable report is a runner failure.
    return countFailures(String(error.stdout ?? ""));
  }
};

const baseline = failingTests("core");
if (baseline !== 0) {
  console.error(
    `The baseline is not green (${baseline} failing). A mutation run against a ` +
      `red baseline proves nothing. Fix the suite first.`,
  );
  process.exit(1);
}
for (const project of new Set(
  MUTANTS.map((mutant) => projectOf(mutant.file)),
)) {
  if (project === "core") {
    continue;
  }
  if (failingTests(project) !== 0) {
    console.error(`The ${project} baseline is not green. Fix the suite first.`);
    process.exit(1);
  }
}
console.log("Baseline green. Running mutants.\n");

let caught = 0;
const survivors = [];

for (const mutant of MUTANTS) {
  const path = new URL(mutant.file, `file://${root}`);
  const original = readFileSync(path, "utf8");
  if (!original.includes(mutant.find)) {
    console.error(
      `Mutant is stale, its target text is gone: ${mutant.describes}`,
    );
    process.exit(1);
  }
  try {
    writeFileSync(path, original.replace(mutant.find, mutant.replace));
    const failed = failingTests(projectOf(mutant.file));
    if (failed > 0) {
      caught += 1;
      console.log(`caught   ${mutant.describes} (${failed} tests went red)`);
      continue;
    }
    survivors.push(mutant.describes);
    console.log(`SURVIVED ${mutant.describes}`);
  } finally {
    writeFileSync(path, original);
  }
}

console.log(`\n${caught} of ${MUTANTS.length} mutants caught.`);
if (survivors.length > 0) {
  console.error("\nSurvivors, each either a missing test or dead code:");
  for (const survivor of survivors) {
    console.error(`  ${survivor}`);
  }
  process.exit(1);
}
