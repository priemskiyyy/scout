import type { SearchAdapter } from "src/types/SearchAdapter";

/**
 * The native types an adapter works with: its client, the provider options a
 * search may pass, and the hit and response it keeps.
 *
 * @example
 * ```ts
 * type TypesenseNative = NativeOf<ReturnType<typeof typesense>>;
 * ```
 */
export type NativeOf<TAdapter> =
  TAdapter extends SearchAdapter<
    infer TClient,
    infer TOptions,
    infer THit,
    infer TResponse
  >
    ? { client: TClient; options: TOptions; hit: THit; response: TResponse }
    : never;
