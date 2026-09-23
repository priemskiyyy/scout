import type { IndexDeclaration } from "src/types/IndexDeclaration";
import type { NativeOf } from "src/types/NativeOf";

/**
 * The shape of one index as a `Scout` serves it: the portable names from its
 * declaration, and the native types of the adapter bound to it.
 *
 * @example
 * ```ts
 * type ProductShape = IndexShapeOf<typeof products, ReturnType<typeof typesense>>;
 * ```
 */
export type IndexShapeOf<TDeclaration, TAdapter> =
  TDeclaration extends IndexDeclaration<
    infer TDocument,
    infer TFilterable,
    infer TFacetable,
    infer THighlightable,
    infer TSortName,
    infer TProfileName
  >
    ? {
        document: TDocument;
        native: NativeOf<TAdapter>;
        filterable: TFilterable;
        facetable: TFacetable;
        highlightable: THighlightable;
        sort: TSortName;
        profile: TProfileName;
      }
    : never;
