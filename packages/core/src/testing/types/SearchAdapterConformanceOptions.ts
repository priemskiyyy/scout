import type { SearchAdapterConformanceFixtures } from "src/testing/types/SearchAdapterConformanceFixtures";
import type { AnySearchAdapter } from "src/types/AnySearchAdapter";
import type { IndexDeclaration } from "src/types/IndexDeclaration";

/**
 * Configures the conformance suite with the corpus's declaration and a fresh
 * adapter for every test.
 *
 * @example
 * ```ts
 * const options: SearchAdapterConformanceOptions<typeof products> = {
 *   name: "engine", index: products, createAdapter: () => engine({ client }), fixtures,
 * };
 * ```
 *
 * @see [Testing an adapter](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type SearchAdapterConformanceOptions<
  TIndex extends IndexDeclaration = IndexDeclaration,
> = {
  /** Label for the generated `describe` block. */
  name: string;
  /**
   * The declaration of the corpus the adapter searches. Every facet,
   * highlight, sort and profile it declares is tested.
   */
  index: TIndex;
  /** Creates a cold adapter. Called once per test. */
  createAdapter: () => AnySearchAdapter;
  /**
   * Whether the engine behind the adapter really evaluates searches. An
   * in-process engine does, and so does a fake that implements the engine's
   * grammar. A fake that only records the request does not, and against one
   * an assertion about which documents came back proves nothing, so those
   * are skipped rather than passed vacuously. Such an adapter asserts the
   * requests it builds in its own tests.
   */
  evaluates?: boolean;
  fixtures: SearchAdapterConformanceFixtures<TIndex>;
};
