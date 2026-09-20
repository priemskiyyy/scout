import type { AnySearchAdapter } from "src/types/AnySearchAdapter";
import type { SearchAdapterConformanceFixtures } from "src/testing/types/SearchAdapterConformanceFixtures";

/**
 * Configures the conformance suite with a fresh adapter for every test.
 *
 * @example
 * ```ts
 * const options: SearchAdapterConformanceOptions = {
 *   name: "my-engine", createAdapter: () => createAdapter(), fixtures,
 * };
 * ```
 *
 * @see [Adapter testing](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type SearchAdapterConformanceOptions = {
  /** Label for the generated describe block. */
  name: string;
  /** Creates a fresh adapter; called once per test. */
  createAdapter: () => AnySearchAdapter;
  fixtures: SearchAdapterConformanceFixtures;
};
