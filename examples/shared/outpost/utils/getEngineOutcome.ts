import type { EngineOutcome } from "examples/shared/outpost/types/EngineOutcome";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";

/** An engine's answer, or its failure, or neither yet. */
export const getEngineOutcome = (
  result: StoreResult | undefined,
  error: Error | null,
): EngineOutcome => {
  if (error !== null) {
    return { kind: "failed", error };
  }

  if (result === undefined) {
    return { kind: "searching" };
  }

  return { kind: "answered", result };
};
