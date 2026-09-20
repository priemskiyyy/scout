/**
 * The part of a fetch `Response` this adapter reads. Nothing else is touched,
 * so an instrumented or polyfilled client only has to provide these three.
 *
 * @example
 * ```ts
 * const response: HttpFetchResponse = { ok: true, status: 200, text: async () => "{}" };
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type HttpFetchResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};
