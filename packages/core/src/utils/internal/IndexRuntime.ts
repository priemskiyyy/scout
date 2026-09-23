import type { AnySearchAdapter } from "src/types/AnySearchAdapter";
import type { FilterFields } from "src/types/FilterFields";
import type { IndexDeclaration } from "src/types/IndexDeclaration";
import type { IndexShape } from "src/types/IndexShape";

/** What every search on one index needs: its declaration, its adapter and its Scout. */
export type IndexRuntime = {
  readonly name: string;
  readonly declaration: IndexDeclaration;
  readonly adapter: AnySearchAdapter;
  /** Aborts when the Scout is disposed. */
  readonly closed: AbortSignal;
  readonly fields: FilterFields<IndexShape>;
};
