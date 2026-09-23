import type { ScoutErrorCode } from "@priemskiyyy/scout";

/** Where the store's search stands: under way, answered, or the code it failed with. */
export type SearchStatus =
  "searching" | "answered" | "answered-by-scout" | ScoutErrorCode;
