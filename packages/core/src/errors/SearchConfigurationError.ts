import { ScoutError } from "src/errors/ScoutError";

/**
 * A programming mistake, thrown as early as Scout can see it: an unknown index
 * name, a provider option that collides with a Scout owned field, a native
 * filter combined with a portable one, or a provider option that cannot be
 * canonically serialised into the query identity.
 *
 * `path` names the offending option when there is one.
 */
export class SearchConfigurationError extends ScoutError<"configuration"> {
  readonly path: string | null;

  constructor(options: { path: string | null; message: string }) {
    super("configuration", options.message);
    this.path = options.path;
  }
}
