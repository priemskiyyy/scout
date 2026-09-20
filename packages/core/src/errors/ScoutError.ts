import type { ScoutErrorCode } from "src/types/ScoutErrorCode";
import { ERROR_NAMES } from "src/utils/constants/errorNames";

/**
 * Base class for Scout failures, discriminated by `code`. `execute()` rejects
 * with these errors so TanStack Query can enter its error state.
 *
 * @example
 * ```ts
 * try {
 *   await search.execute();
 * } catch (error) {
 *   if (error instanceof ScoutError && error.code === "unsupported-feature") {
 *     reportUnsupported(error);
 *   }
 * }
 * ```
 */
export class ScoutError<
  TCode extends ScoutErrorCode = ScoutErrorCode,
> extends Error {
  readonly code: TCode;

  constructor(code: TCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.code = code;
    this.name = ERROR_NAMES[code];
  }
}
