import type { StoreResult } from "examples/shared/outpost/types/StoreResult";

/** How one engine answered the store's search, for its card to show. */
export type EngineOutcome =
  | { kind: "searching" }
  | { kind: "answered"; result: StoreResult }
  | { kind: "failed"; error: Error };
