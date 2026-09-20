import type { TypesenseHighlight } from "src/types/TypesenseHighlight";

/**
 * One Typesense hit, kept whole on `hit.native` including `text_match`.
 *
 * @example
 * ```ts
 * const hit: TypesenseHit = { document: { id: "p1", name: "Shoe" }, text_match: 100 };
 * ```
 * @see [typesense adapter](https://priemskiyyy.github.io/scout/adapters.html#typesense)
 */
export type TypesenseHit = {
  readonly document: unknown;
  readonly text_match?: number;
  readonly highlights?: readonly TypesenseHighlight[];
};
