import type { AnySearchAdapter } from "src/types/AnySearchAdapter";

/**
 * The supertype a dictionary of declarations is constrained by.
 *
 * It describes the handle structurally rather than through `IndexShape`,
 * because an index's shape sits in covariant positions (the document a search
 * returns) and contravariant ones (the sort name a search accepts) at the same
 * time, so no single erased shape can stand for all of them.
 *
 * @example
 * ```ts
 * const indexes: Readonly<Record<string, AnyIndexDeclaration>> = { products, articles };
 * ```
 *
 * @see [Scout usage](https://priemskiyyy.github.io/scout/indexes.html)
 */
export type AnyIndexDeclaration = {
  readonly create: (
    name: string,
    isDisposed: () => boolean,
  ) => { name: string; native: unknown; search: (text: string) => unknown };
  readonly adapter: AnySearchAdapter;
};
