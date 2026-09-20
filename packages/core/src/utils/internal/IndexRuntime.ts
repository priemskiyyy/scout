import type { SearchAdapter } from "src/types/SearchAdapter";
import type { StandardSchema } from "src/types/StandardSchema";

/**
 * Execution dependencies shared by an index's builders. The option type ties
 * each request to its adapter without a type assertion.
 */
export type IndexRuntime<TOptions, TDocument> = {
  adapter: SearchAdapter<unknown, TOptions, unknown, unknown>;
  schema: StandardSchema<TDocument>;
  identify: (document: TDocument) => string;
  validate: "error" | "skip";
  emptyQuery: "allow" | "reject";
  isDisposed: () => boolean;
};
