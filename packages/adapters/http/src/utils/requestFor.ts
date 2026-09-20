import type { HttpRequestBody } from "src/types/HttpRequestBody";
import type { HttpMethod } from "src/types/HttpMethod";
import type { HttpHeaders } from "src/types/HttpHeaders";
import type { HttpFetchInit } from "src/types/HttpFetchInit";
import { assertUnreachable } from "@priemskiyyy/scout";

const bodyToQuery = (body: HttpRequestBody): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "undefined") {
      continue;
    }
    params.set(key, typeof value === "string" ? value : JSON.stringify(value));
  }
  return params.toString();
};

const withQuery = (endpoint: string, query: string): string => {
  if (query === "") {
    return endpoint;
  }
  const fragmentAt = endpoint.indexOf("#");
  const base = fragmentAt === -1 ? endpoint : endpoint.slice(0, fragmentAt);
  const fragment = fragmentAt === -1 ? "" : endpoint.slice(fragmentAt);
  return `${base}${base.includes("?") ? "&" : "?"}${query}${fragment}`;
};

export const requestFor = (
  method: HttpMethod,
  endpoint: string,
  body: HttpRequestBody,
  headers: HttpHeaders,
  signal: AbortSignal,
): { url: string; init: HttpFetchInit } => {
  if (method === "GET") {
    return {
      url: withQuery(endpoint, bodyToQuery(body)),
      init: { method, headers, signal },
    };
  }
  if (method === "POST") {
    return {
      url: endpoint,
      // The caller's headers are applied last, so a backend that wants a
      // different content type can say so without losing the default.
      init: {
        method,
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal,
      },
    };
  }
  return assertUnreachable(method);
};
