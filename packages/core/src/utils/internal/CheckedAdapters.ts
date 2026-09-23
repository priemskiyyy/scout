import type { IndexDeclaration } from "src/types/IndexDeclaration";

type SortNameOf<TDeclaration> =
  TDeclaration extends IndexDeclaration<
    unknown,
    string,
    string,
    string,
    infer TSortName
  >
    ? Exclude<TSortName, "relevance">
    : never;

// Only an adapter whose sorts have literal names can be checked here; one
// typed by a plain record is checked when the Scout is built.
type SortCoverage<TAdapter, TDeclaration> = TAdapter extends {
  readonly sorts: infer TSorts;
}
  ? string extends keyof TSorts
    ? unknown
    : { readonly sorts: Readonly<Record<SortNameOf<TDeclaration>, unknown>> }
  : unknown;

/**
 * What the adapters must also be: an adapter under a name no index has is
 * `never`, and one that serves sorts through configuration of its own covers
 * every sort its index declares.
 */
export type CheckedAdapters<TIndexes, TAdapters> = {
  readonly [TName in keyof TAdapters]: TName extends keyof TIndexes
    ? SortCoverage<TAdapters[TName], TIndexes[TName]>
    : never;
};
