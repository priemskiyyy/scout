import { ScoutError } from "src/errors/ScoutError";

/**
 * The search asked for portable behaviour this adapter does not implement.
 *
 * Scout throws rather than dropping the filter, ignoring the facet or
 * emulating the feature over one returned page, because a silently narrower
 * search returns wrong results that look right.
 */
export class UnsupportedSearchFeatureError extends ScoutError<"unsupported-feature"> {
  readonly adapter: string;
  readonly feature: string;

  constructor(options: { adapter: string; feature: string; message: string }) {
    super("unsupported-feature", options.message);
    this.adapter = options.adapter;
    this.feature = options.feature;
  }
}
