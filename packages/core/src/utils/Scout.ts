import type { AdaptersFor } from "src/types/AdaptersFor";
import type { AnySearchAdapter } from "src/types/AnySearchAdapter";
import type { CheckedAdapters } from "src/utils/internal/CheckedAdapters";
import type { IndexDeclaration } from "src/types/IndexDeclaration";
import type { IndexShapeOf } from "src/types/IndexShapeOf";
import type { SearchIndex } from "src/types/SearchIndex";
import { createFilterFields } from "src/utils/internal/createFilterFields";
import { createSearchBuilder } from "src/utils/internal/createSearchBuilder";
import { getOwnValue } from "src/utils/internal/getOwnValue";
import { ScoutError } from "src/utils/ScoutError";

type Declarations = Readonly<Record<string, IndexDeclaration>>;

const getQuotedNames = (names: readonly string[]) => {
  if (names.length === 0) {
    return "none";
  }

  return names.map((name) => JSON.stringify(name)).join(", ");
};

const getIndexesHint = (names: readonly string[]) => {
  if (names.length === 0) {
    return "This Scout declares no indexes.";
  }

  return `The declared indexes are ${getQuotedNames(names)}.`;
};

// A key the adapter configured but the index never declared is a typo that
// would otherwise do nothing, so it is refused like a missing one.
const assertAdapterNamesMatchIndex = (
  index: string,
  kind: "sorts" | "profiles",
  declared: readonly string[],
  configured: object | undefined,
  builtIn: string,
) => {
  if (configured === undefined) {
    return;
  }

  for (const name of Object.keys(configured)) {
    if (declared.includes(name)) {
      continue;
    }

    throw new ScoutError({
      code: "configuration",
      message:
        `The adapter for ${index} configures ${kind}.${name}, which the index ` +
        `does not declare. The index declares ${getQuotedNames(declared)}.`,
    });
  }

  if (kind === "profiles") {
    return;
  }

  for (const name of declared) {
    if (name === builtIn || Object.hasOwn(configured, name)) {
      continue;
    }

    throw new ScoutError({
      code: "configuration",
      message:
        `The adapter for ${index} serves sorts through configuration of its ` +
        `own and has none for ${name}. Add ${name} to its sorts.`,
    });
  }
};

/**
 * One Scout per application or security context, over named indexes, each
 * served by one adapter.
 *
 * Constructing it opens nothing and sends nothing. It holds no results and no
 * cache: TanStack Query or the application owns those. On an account or
 * permission change, dispose it and build a new one with credentials for the
 * new context, so no previous account's results can be served.
 *
 * @example
 * ```ts
 * const scout = new Scout({
 *   indexes: { products },
 *   adapters: { products: typesense({ client, collection: "products" }) },
 * });
 * const result = await scout.index("products").search("boots").execute();
 * ```
 */
export class Scout<
  TIndexes extends Declarations,
  TAdapters extends AdaptersFor<TIndexes>,
> {
  #indexes: Readonly<Record<string, IndexDeclaration>>;
  #adapters: Readonly<Record<string, AnySearchAdapter>>;
  #handles = new Map<string, unknown>();
  #closed = new AbortController();

  constructor({
    indexes,
    adapters,
  }: {
    indexes: TIndexes;
    adapters: TAdapters & CheckedAdapters<TIndexes, TAdapters>;
  }) {
    const declared: Record<string, IndexDeclaration> = { ...indexes };
    const supplied: Readonly<Record<string, AnySearchAdapter>> = adapters;
    const bound: Record<string, AnySearchAdapter> = {};

    for (const name of Object.keys(declared)) {
      const adapter = getOwnValue(supplied, name);
      const declaration = declared[name];

      if (adapter === undefined || declaration === undefined) {
        throw new ScoutError({
          code: "configuration",
          message: `The index ${JSON.stringify(name)} has no adapter. Add one under adapters.${name}.`,
        });
      }

      assertAdapterNamesMatchIndex(
        name,
        "sorts",
        Object.keys(declaration.sorts),
        adapter.sorts,
        "relevance",
      );

      assertAdapterNamesMatchIndex(
        name,
        "profiles",
        Object.keys(declaration.profiles),
        adapter.profiles,
        "default",
      );

      bound[name] = adapter;
    }

    for (const name of Object.keys(adapters)) {
      if (Object.hasOwn(declared, name)) {
        continue;
      }

      throw new ScoutError({
        code: "configuration",
        message: `adapters.${name} serves no index. The indexes are ${getQuotedNames(Object.keys(declared))}.`,
      });
    }

    this.#indexes = declared;
    this.#adapters = bound;
  }

  /**
   * The handle for one declared index. Handles are stateless and cached, so
   * calling this in a render is fine.
   */
  index = <TName extends keyof TIndexes & string>(
    name: TName,
  ): SearchIndex<IndexShapeOf<TIndexes[TName], TAdapters[TName]>> =>
    this.#resolveIndex(name);

  /**
   * Rejects every search still in flight, then disposes each adapter, even
   * when another one throws. Repeated calls are safe. One failure is rethrown;
   * several form an `AggregateError`. Injected clients stay the application's.
   */
  dispose = () => {
    if (this.#closed.signal.aborted) {
      return;
    }

    this.#closed.abort();

    const errors: unknown[] = [];

    for (const adapter of Object.values(this.#adapters)) {
      try {
        adapter.dispose?.();
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, "Scout cleanup failed.");
    }
  };

  // The overload preserves the name-to-shape relation a dictionary lookup
  // erases, as `resolveIndex` always has.
  #resolveIndex<TName extends keyof TIndexes & string>(
    name: TName,
  ): SearchIndex<IndexShapeOf<TIndexes[TName], TAdapters[TName]>>;

  #resolveIndex(name: string): unknown {
    const cached = this.#handles.get(name);

    if (cached !== undefined) {
      return cached;
    }

    const declaration = getOwnValue(this.#indexes, name);
    const adapter = getOwnValue(this.#adapters, name);

    if (declaration === undefined || adapter === undefined) {
      throw new ScoutError({
        code: "configuration",
        message: `There is no index named ${JSON.stringify(name)}. ${getIndexesHint(Object.keys(this.#indexes))}`,
      });
    }

    const runtime = {
      name,
      declaration,
      adapter,
      closed: this.#closed.signal,
      fields: createFilterFields(declaration.filterable),
    };

    const handle = Object.freeze({
      name,
      native: adapter.native,
      search: (text: string) => createSearchBuilder(runtime, text),
    });

    this.#handles.set(name, handle);

    return handle;
  }
}
