import { ScoutError } from "src/errors/ScoutError";

/**
 * The provider rejected the request or failed to answer. The original error is
 * on `cause` with its own stack, never flattened into the message, and Scout
 * adds nothing to it that could carry a credential.
 */
export class SearchProviderError extends ScoutError<"provider"> {
  readonly adapter: string;

  constructor(options: { adapter: string; message: string; cause: unknown }) {
    super("provider", options.message, { cause: options.cause });
    this.adapter = options.adapter;
  }
}
