import type { AdapterSearchRequest } from "@priemskiyyy/scout";

/**
 * What `request` receives for one search: the portable search, whose
 * `JSON.stringify(search)` is its wire form, and a signal that aborts when
 * the caller aborts or the Scout is disposed.
 *
 * @example
 * ```ts
 * const request = async ({ search, signal }: HttpRequest) => {
 *   const response = await fetch("/api/search", { method: "POST", body: JSON.stringify(search), signal });
 *   return response.json();
 * };
 * ```
 * @see [http adapter](https://priemskiyyy.github.io/scout/adapters.html#http-your-own-endpoint)
 */
export type HttpRequest<TNativeOptions = never> = {
  search: AdapterSearchRequest<TNativeOptions>;
  signal: AbortSignal;
};
