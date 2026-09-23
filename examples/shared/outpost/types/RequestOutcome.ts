/**
 * How one request to your API ended. `orphaned` is a request that ran to the
 * end after its caller aborted, because your client did not pass the signal on.
 */
export type RequestOutcome =
  "answered" | "refused" | "failed" | "aborted" | "orphaned";
