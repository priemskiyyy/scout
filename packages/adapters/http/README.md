# @priemskiyyy/scout-http

Search your own backend with [Scout](https://priemskiyyy.github.io/scout/), through your own client. You give the adapter one function that sends a search, and your client keeps everything it already owns: the address, authentication, headers, retries and status handling.

## Installation

```sh
pnpm add @priemskiyyy/scout @priemskiyyy/scout-http
```

## Create a Scout

```ts
import { index, Scout } from "@priemskiyyy/scout";
import { http } from "@priemskiyyy/scout-http";

const products = index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["title", "brand"],
  filterable: ["brand", "price"],
  facetable: { brand: "string" },
  highlightable: ["title"],
  sorts: { cheapest: { price: "asc" } },
});

const scout = new Scout({
  indexes: { products },
  adapters: {
    products: http({
      fingerprint: "catalogue-api",
      request: async ({ search, signal }) => {
        const response = await fetch("https://api.example.com/search", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify(search),
          signal,
        });

        if (!response.ok) {
          throw new Error(`The search endpoint answered ${response.status}.`);
        }

        return response.json();
      },
    }),
  },
});
```

## The request

`request({ search, signal })` sends one search and answers for it:

| `request` does                                               | Scout makes of it                                              |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| resolves with a `ScoutWireResponse`, the wire format below   | the search's result                                            |
| resolves with `{ "refusal": { "message": "..." } }`          | a `ScoutError` with code `unsupported-feature` and the message |
| throws or rejects                                            | a `ScoutError` with code `provider`, with your error as cause  |
| throws a `ScoutError`                                        | that error, unchanged                                          |
| is still running when the caller aborts or Scout is disposed | `aborted` or `disposed` at once: `signal` aborts               |

- `search` is Scout's portable search, already resolved against the index: `index`, `query`, `searchable`, `profile`, `sort` as `{ name, by }` or `null`, `filter` as the normalised filter AST or `null`, `facets`, `highlights`, `page` and `provider`. `JSON.stringify(search)` is its wire form, and its type is `AdapterSearchRequest` from `@priemskiyyy/scout`.
- An empty `query` means browse: match everything the filter allows.
- Pass `signal` on, so an abandoned search stops on the wire.
- `request` resolves with `ScoutWireResponse | ScoutWireRefusal`, and the adapter reads it as typed. Your client owns that shape, the way it owns the address and authentication. Documents are still checked by the index's schema.

## A backend you do not trust

When the answer's shape is not yours to vouch for, check it inside `request` with your schema library before Scout reads it:

```ts
import { z } from "zod";

const Answer = z.union([
  z.object({ refusal: z.object({ message: z.string() }) }),
  z.object({ hits: z.array(z.looseObject({ document: z.unknown() })) }),
]);

http({
  fingerprint: "catalogue-api",
  request: async ({ search, signal }) => {
    const response = await fetch("https://api.example.com/search", {
      method: "POST",
      body: JSON.stringify(search),
      signal,
    });

    if (!response.ok) {
      throw new Error(`The search endpoint answered ${response.status}.`);
    }

    return Answer.parse(await response.json());
  },
});
```

Extend `Answer` with the `total`, `facets` and `took` your backend answers. A body the schema rejects throws, and reaches the caller as a `provider` error with the schema's error as its cause.

## The answer

The backend answers a `ScoutWireResponse`. Only `hits` is required:

```json
{
  "hits": [
    {
      "document": { "id": "1", "title": "Trail running shoe" },
      "highlights": {
        "title": [
          {
            "path": ["title"],
            "parts": [
              { "text": "Trail running ", "matched": false },
              { "text": "shoe", "matched": true }
            ],
            "truncated": false
          }
        ]
      },
      "score": 1.6
    }
  ],
  "total": { "value": 42, "accuracy": "exact", "scope": "matches" },
  "facets": {
    "brand": {
      "values": [{ "value": "Apex", "count": 12 }],
      "exhaustive": true
    }
  },
  "took": 7,
  "retrievable": 1000
}
```

- `total` says how sure the backend is: `exact`, `estimated`, `lower-bound` or `unknown`. A total left out is `unknown`, never counted from the page.
- A facet's values are as the backend stores them, and Scout decodes each to the type the index declared. `exhaustive` left out is `"unknown"`.
- Highlights are Scout's own fragments, keyed by field: a `path`, the `parts`, and whether the value was `truncated` (`true`, `false` or `"unknown"`). Highlights left out are none.
- `took` is the backend's own time in milliseconds, and `null` when left out.
- `retrievable` is how many hits paging can reach, when the backend stops paging before its total.
- Anything else on a hit, such as a score, reaches the application on `hit.native`.

## Options

| Option        | Default  | Meaning                                                                                       |
| ------------- | -------- | --------------------------------------------------------------------------------------------- |
| `fingerprint` | required | Names the backend in every query key. Never a credential: it reaches cache keys and devtools. |
| `request`     | required | Sends one search through your client, as described above.                                     |

Provider options are yours to type: `http<{ tenant: string }>({ ... })` makes `.provider({ tenant: "eu" })` typed, and it reaches the backend as `search.provider`.

## Behavior

- Platforms: anywhere your client runs, browsers, React Native, Node and edge runtimes alike. There is no SDK and nothing to initialize.
- The backend decides what it supports. What it cannot serve, it refuses with the refusal body, and nothing checks what it claims, so run the conformance suite from `@priemskiyyy/scout/testing` against it.
- A search is sent once: there is no retry, no queue and no cache in the adapter. TanStack Query or your client owns those.
- `native` is the `request` you passed.

## Tests

The tests run against an in-memory backend injected through `request`. It receives each search as JSON and really evaluates it, so the conformance suite runs with `evaluates: true`. No request is sent over a network from this repository.

MIT
