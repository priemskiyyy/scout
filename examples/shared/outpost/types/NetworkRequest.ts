import type { AdapterSearchRequest } from "@priemskiyyy/scout";

import type { RequestOutcome } from "examples/shared/outpost/types/RequestOutcome";

/** One request your API received, and how it ended. */
export type NetworkRequest = {
  id: number;
  at: number;
  search: AdapterSearchRequest;
  outcome: RequestOutcome;
  status: number | null;
  duration: number;
  hits: number | null;
};
