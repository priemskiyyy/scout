import { SearchConfigurationError } from "src/errors/SearchConfigurationError";
import type { AnyIndexDeclaration } from "src/types/AnyIndexDeclaration";

type Declarations = Readonly<Record<string, AnyIndexDeclaration>>;

// The overload preserves the name-to-shape relation erased by a dictionary lookup.
function resolveIndex<
  TIndexes extends Declarations,
  TName extends keyof TIndexes & string,
>(
  indexes: TIndexes,
  name: TName,
  isDisposed: () => boolean,
): ReturnType<TIndexes[TName]["create"]>;
function resolveIndex(
  indexes: Declarations,
  name: string,
  isDisposed: () => boolean,
): ReturnType<AnyIndexDeclaration["create"]> {
  const declaration = Object.hasOwn(indexes, name) ? indexes[name] : undefined;
  if (typeof declaration === "undefined") {
    const declared = Object.keys(indexes);
    throw new SearchConfigurationError({
      path: name,
      message:
        `There is no index named ${JSON.stringify(name)}. ` +
        (declared.length === 0
          ? `This Scout was constructed with no indexes.`
          : `The declared indexes are ${declared.map((entry) => JSON.stringify(entry)).join(", ")}.`),
    });
  }
  return declaration.create(name, isDisposed);
}

/**
 * One Scout per application, over named indexes.
 *
 * Constructing it opens nothing and sends nothing. It holds no results and no
 * cache: TanStack Query or the application owns those. Its only state is
 * whether it has been disposed.
 *
 * One instance belongs to one security context. On an account or permission
 * change, dispose it and build a new one with credentials for the new context,
 * rather than reusing it, so no previous account's results can be served.
 *
 * @example
 * ```ts
 * const scout = new Scout({ indexes: { products } });
 * const result = await scout.index("products").search("boots").execute();
 * ```
 */
export class Scout<TIndexes extends Declarations> {
  #indexes: TIndexes;
  #disposed = false;

  constructor({ indexes }: { indexes: TIndexes }) {
    this.#indexes = { ...indexes };
  }

  /**
   * Returns a stateless handle for a declared index.
   */
  index = <TName extends keyof TIndexes & string>(
    name: TName,
  ): ReturnType<TIndexes[TName]["create"]> =>
    resolveIndex(this.#indexes, name, () => this.#disposed);

  /**
   * Disposes every adapter, including when another adapter throws. Repeated
   * calls are safe. One failure is rethrown; several form an `AggregateError`.
   * Injected provider clients remain owned by the application.
   */
  dispose = () => {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    const errors: unknown[] = [];
    for (const declaration of Object.values(this.#indexes)) {
      try {
        declaration.adapter.dispose();
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
}
