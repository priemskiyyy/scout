import type { ScoutErrorCode } from "src/types/ScoutErrorCode";

/**
 * The class name reported for each code. Taken from a lookup rather than from
 * `new.target.name`, which a consumer's minifier is free to mangle, so a stack
 * trace in a production bundle still names the failure.
 */
export const ERROR_NAMES = {
  validation: "SearchValidationError",
  "unsupported-feature": "UnsupportedSearchFeatureError",
  provider: "SearchProviderError",
  aborted: "SearchAbortedError",
  disposed: "SearchDisposedError",
  configuration: "SearchConfigurationError",
} as const satisfies Record<ScoutErrorCode, string>;
