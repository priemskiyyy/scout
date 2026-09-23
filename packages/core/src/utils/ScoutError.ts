import type { ScoutErrorCode } from "src/types/ScoutErrorCode";

// `{ cause: undefined }` would still give the error a `cause` of its own.
const getErrorOptions = (cause: unknown): ErrorOptions | undefined => {
  if (cause === undefined) {
    return undefined;
  }

  return { cause };
};

/**
 * Every failure Scout reports, with a code to branch on. `execute()` rejects
 * with one, so TanStack Query enters its error state, and a provider failure
 * keeps the original under `cause`.
 *
 * @example
 * ```ts
 * try {
 *   await search.execute();
 * } catch (error) {
 *   if (error instanceof ScoutError && error.code === "unsupported-feature") {
 *     hideFacets();
 *   }
 * }
 * ```
 */
export class ScoutError extends Error {
  readonly code: ScoutErrorCode;

  constructor({
    code,
    message,
    cause,
  }: {
    code: ScoutErrorCode;
    message: string;
    cause?: unknown;
  }) {
    super(message, getErrorOptions(cause));
    this.name = "ScoutError";
    this.code = code;
  }
}
