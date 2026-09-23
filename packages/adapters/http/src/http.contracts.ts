import { Scout } from "@priemskiyyy/scout";
import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { expectTypeOf } from "vitest";

import { http } from "src/http";
import { productIndex } from "src/http.fixture";
import type { HttpRequest } from "src/types/HttpRequest";
import type { ScoutWireRefusal } from "src/types/ScoutWireRefusal";
import type { ScoutWireResponse } from "src/types/ScoutWireResponse";

// This adapter has no SDK to pin, because its client is the application's.
// So this file pins what an application writes, a request over the
// platform's own fetch, and what a backend answers.

const adapter = http({
  fingerprint: "catalogue-api",
  request: async ({ search, signal }) => {
    const response = await fetch("https://api.test/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(search),
      signal,
    });

    if (!response.ok) {
      throw new Error(`The search endpoint answered ${response.status}.`);
    }

    return response.json();
  },
});

// An HTTP adapter serves an index like any other.
new Scout({
  indexes: { products: productIndex },
  adapters: { products: adapter },
});

/** The search a request receives is the portable one. */
expectTypeOf<HttpRequest["search"]>().toEqualTypeOf<
  AdapterSearchRequest<never>
>();

/** A request is always handed a signal, so a search can stop on the wire. */
expectTypeOf<HttpRequest["signal"]>().toEqualTypeOf<AbortSignal>();

// Provider options are the application's own, and reach the request typed.
const typed = http<{ tenant: string }>({
  fingerprint: "catalogue-api",
  request: async ({ search }) => {
    expectTypeOf(search.provider).toEqualTypeOf<{ tenant: string } | null>();

    return { hits: [] };
  },
});

expectTypeOf(typed.search)
  .parameter(0)
  .toExtend<AdapterSearchRequest<{ tenant: string }>>();

// @ts-expect-error A fingerprint names the backend, because the adapter knows no address of its own.
http({ request: async () => ({ hits: [] }) });

http({
  fingerprint: "catalogue-api",
  // @ts-expect-error A request answers asynchronously, as a client does.
  request: () => ({ hits: [] }),
});

http({
  fingerprint: "catalogue-api",
  // @ts-expect-error A request answers in the wire format, not with any body.
  request: async () => ({ rows: [] }),
});

/** What a backend answers, its own keys on a hit included. */
const answer: ScoutWireResponse = {
  hits: [
    {
      document: { id: "1" },
      score: 1.6,
      highlights: {
        title: [
          {
            path: ["title"],
            parts: [{ text: "shoe", matched: true }],
            truncated: false,
          },
        ],
      },
    },
  ],
  total: { value: 1, accuracy: "exact", scope: "matches" },
  facets: {
    brand: { values: [{ value: "Apex", count: 1 }], exhaustive: true },
  },
  took: 7,
};

const refusal: ScoutWireRefusal = {
  refusal: { message: "Facets on price are not supported." },
};

const invented: ScoutWireResponse = {
  hits: [],
  // @ts-expect-error A backend cannot invent a fifth total accuracy.
  total: { value: 0, accuracy: "counted", scope: "matches" },
};

// Exported so the probes count as used; nothing imports this file.
export { adapter, answer, invented, refusal, typed };
