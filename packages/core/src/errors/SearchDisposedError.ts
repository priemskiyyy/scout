import { ScoutError } from "src/errors/ScoutError";

/**
 * The Scout instance or its index was disposed, either before the search
 * started or while it was in flight.
 */
export class SearchDisposedError extends ScoutError<"disposed"> {
  readonly index: string;

  constructor(options: { index: string; message: string }) {
    super("disposed", options.message);
    this.index = options.index;
  }
}
