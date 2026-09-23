import type {
  HttpRequest,
  ScoutWireRefusal,
  ScoutWireResponse,
} from "@priemskiyyy/scout-http";

import type { BackendState } from "examples/shared/outpost/types/BackendState";
import type { EventLog } from "examples/shared/outpost/types/EventLog";
import type { NetworkRequest } from "examples/shared/outpost/types/NetworkRequest";
import type { ValueStore } from "examples/shared/outpost/types/ValueStore";

/** Your API, running in the page, with the lab's switches on it. */
export type CatalogueBackend = {
  state: ValueStore<BackendState>;
  requests: EventLog<NetworkRequest>;
  inFlight: ValueStore<number>;
  /**
   * Armed by the lab, spent by the next request. It lives apart from
   * `state`, whose changes the page reads as your API answering
   * differently, so spending it never sends another search.
   */
  failNext: ValueStore<boolean>;
  update: (patch: Partial<BackendState>) => void;
  search: (
    request: HttpRequest,
  ) => Promise<ScoutWireResponse | ScoutWireRefusal>;
};
