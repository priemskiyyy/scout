import { ScoutError } from "@priemskiyyy/scout";

import type { AlgoliaSearchOptions } from "src/types/AlgoliaSearchOptions";
import { RESERVED_OPTIONS } from "src/utils/constants/parameters";

/**
 * Refuses a profile that sets a parameter Scout writes. A profile's
 * parameters join every search that names it, so one of those would be
 * overwritten, or, on a search that leaves it unset, silently change what the
 * search means.
 *
 * @example
 * ```ts
 * assertProfilesOmitReservedOptions({ strict: { typoTolerance: false } });
 * ```
 */
export const assertProfilesOmitReservedOptions = (
  profiles: Readonly<Record<string, AlgoliaSearchOptions>>,
) => {
  for (const [name, parameters] of Object.entries(profiles)) {
    for (const key of RESERVED_OPTIONS) {
      if (Object.hasOwn(parameters, key)) {
        throw new ScoutError({
          code: "configuration",
          message: `profiles.${name}.${key} is written by Scout from the search itself.`,
        });
      }
    }
  }
};
