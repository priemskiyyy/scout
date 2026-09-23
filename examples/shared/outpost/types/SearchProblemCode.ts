import type { ScoutErrorCode } from "@priemskiyyy/scout";

/** A failed search's code, or `unexpected` for anything Scout did not create. */
export type SearchProblemCode = ScoutErrorCode | "unexpected";
