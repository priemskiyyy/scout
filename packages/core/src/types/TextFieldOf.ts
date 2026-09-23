/**
 * The fields of a document that hold text, which is what a query can search:
 * a string, or a list of strings.
 *
 * @example
 * ```ts
 * type Searchable = TextFieldOf<Product>; // "name" | "brand" | "tags"
 * ```
 */
export type TextFieldOf<TDocument> = {
  [TField in keyof TDocument & string]: [
    NonNullable<TDocument[TField]>,
  ] extends [string | readonly string[]]
    ? TField
    : never;
}[keyof TDocument & string];
