// Everything npm decides from `package.json` at publish time, checked before a
// release rather than after it. A wrong `repository.directory` or a missing
// `publishConfig.access` is invisible locally and permanent once published.
import assert from "node:assert/strict";
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const REPOSITORY = "git+https://github.com/priemskiyyy/scout.git";
const ISSUES = "https://github.com/priemskiyyy/scout/issues";
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/;

const changelog = readFileSync(new URL("CHANGELOG.md", root), "utf8");

const packages = Object.fromEntries(
  ["packages", "packages/adapters"].flatMap((group) =>
    readdirSync(new URL(group, root))
      .filter((directory) =>
        existsSync(new URL(`${group}/${directory}/package.json`, root)),
      )
      .map((directory) => {
        const metadata = JSON.parse(
          readFileSync(
            new URL(`${group}/${directory}/package.json`, root),
            "utf8",
          ),
        );

        return [
          metadata.name,
          { directory: `${group}/${directory}`, metadata },
        ];
      }),
  ),
);

const tag = process.env.RELEASE_TAG;

// A release tag names its package: `<unscoped name>-v<version>`. A version
// always starts with a digit, so a package name ending in `-v...` is never
// mistaken for the version suffix.
const fromTag =
  tag === undefined
    ? []
    : [
        Object.keys(packages).find(
          (name) => name.split("/").at(-1) === tag.replace(/-v\d[\w.+-]*$/, ""),
        ) ?? tag,
      ];

const selected = [...process.argv.slice(2), ...fromTag];
const names = selected.length === 0 ? Object.keys(packages) : selected;

for (const name of names) {
  const configuration = packages[name];

  assert(configuration, `Unknown release package: ${name}`);

  const { metadata, directory } = configuration;

  assert.equal(metadata.license, "MIT", `${name} must be MIT licensed.`);
  assert.equal(
    metadata.repository.url,
    REPOSITORY,
    `${name} must point at the monorepo.`,
  );
  assert.equal(
    metadata.repository.directory,
    directory,
    `${name} must point at its own directory in the monorepo.`,
  );
  assert.equal(metadata.bugs.url, ISSUES, `${name} must name where to report.`);
  assert.equal(
    metadata.publishConfig.access,
    "public",
    `${name} is scoped, so it publishes privately unless access is public.`,
  );
  assert.match(metadata.version, SEMVER, `${name} needs a semver version.`);
  // A bundler may only drop an unused import when the package promises it has
  // no import time effects, and every package here is pure re-exports.
  assert.equal(
    metadata.sideEffects,
    false,
    `${name} must declare sideEffects: false.`,
  );

  const entry = changelog
    .split("\n")
    .find((line) => line.startsWith(`## ${name} ${metadata.version} - `));

  assert(entry, `${name} ${metadata.version} needs a changelog entry.`);

  if (tag !== undefined) {
    assert.equal(
      tag,
      `${name.split("/").at(-1)}-v${metadata.version}`,
      "A release tag must match the package version.",
    );
    assert.match(
      entry,
      /- \d{4}-\d{2}-\d{2}$/,
      "Date the changelog entry before publishing a release.",
    );

    if (process.env.GITHUB_OUTPUT !== undefined) {
      appendFileSync(process.env.GITHUB_OUTPUT, `package=${name}\n`);
    }
  }

  console.log(`Release metadata is valid for ${name} ${metadata.version}.`);
}
