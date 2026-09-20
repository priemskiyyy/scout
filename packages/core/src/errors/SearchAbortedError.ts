import { ScoutError } from "src/errors/ScoutError";

/**
 * The search was aborted through its signal.
 *
 * `cancellation` records what the abort actually achieved. `"transport"` means
 * the provider request was cancelled. `"logical"` means Scout stopped waiting
 * but the engine may still be computing and billing for the query, which is
 * the honest answer for an SDK with no `AbortSignal` support.
 */
export class SearchAbortedError extends ScoutError<"aborted"> {
  readonly adapter: string;
  readonly cancellation: "logical" | "transport";

  constructor(options: {
    adapter: string;
    cancellation: "logical" | "transport";
    message: string;
    cause?: unknown;
  }) {
    super("aborted", options.message, { cause: options.cause });
    this.adapter = options.adapter;
    this.cancellation = options.cancellation;
  }
}
