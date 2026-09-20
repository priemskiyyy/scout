import { ScoutError } from "src/errors/ScoutError";

/**
 * A document did not satisfy its index schema, or a query was refused before
 * dispatch because the index does not accept it.
 *
 * `issues` carries the validator's own messages, or a single sentence when the
 * refusal came from Scout rather than from the schema.
 */
export class SearchValidationError extends ScoutError<"validation"> {
  readonly index: string;
  readonly issues: readonly string[];

  constructor(options: {
    index: string;
    issues: readonly string[];
    message: string;
    cause?: unknown;
  }) {
    super("validation", options.message, { cause: options.cause });
    this.index = options.index;
    this.issues = options.issues;
  }
}
