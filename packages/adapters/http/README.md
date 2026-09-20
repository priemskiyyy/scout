# @priemskiyyy/scout-http

HTTP adapter for [Scout](../../core). It puts a JSON search endpoint you
already own behind the portable contract, with no SDK and no runtime
dependencies.

It owns the plumbing every HTTP backend needs and none of the semantics only
the backend knows. The request body and the response shape are yours, through
`toRequest` and `fromResponse`, because inventing a protocol on your backend's
behalf is the one thing a generic HTTP adapter must not do. If you own both
ends and would rather not design one, `scoutWireRequest` and
`scoutWireResponse` are a documented pair you can pass straight in.

## What the package owns

| Concern           | What it does                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| Cancellation      | The `AbortSignal` goes into `fetch`, so the connection is aborted. `cancellation` defaults to `"transport"`.         |
| Refused responses | A non-2xx becomes `SearchProviderError` with the status and up to 200 characters of the body. Never the headers.     |
| Malformed bodies  | A body that is not JSON becomes `SearchProviderError` saying so, with the `SyntaxError` on `cause`.                  |
| Empty results     | A filter that matches nothing is answered with an empty page and no request at all.                                  |
| Headers           | A static record, or a function called once per search so a refreshed token is the one that travels. It may be async. |
| Methods           | `POST` with a JSON body, or `GET` with the same request in the query string.                                         |
| Identity          | `fingerprint` defaults to the endpoint with any userinfo and query string stripped out of it.                        |
| Capabilities      | Declared by you and enforced by the core before dispatch, including `maxPageSize`.                                   |

## Installation

```sh
pnpm add @priemskiyyy/scout @priemskiyyy/scout-http
```

There is no SDK to install. The provider is the platform: `globalThis.fetch` by
default, or whatever you inject.

## Create an index

```ts
import { index, Scout } from "@priemskiyyy/scout";
import {
  http,
  scoutWireRequest,
  scoutWireResponse,
} from "@priemskiyyy/scout-http";
import { ProductSchema } from "./catalogue";

const scout = new Scout({
  indexes: {
    products: index({
      schema: ProductSchema,
      id: (product) => product.id,
      filterable: ["brand", "price"],
      facetable: ["brand"],
      highlightable: ["title"],
      sorts: ["relevance", "cheapest"],
      profiles: ["default"],
      adapter: http({
        endpoint: "https://api.example.com/search",
        headers: async () => ({ authorization: `Bearer ${await token()}` }),
        capabilities: {
          filters: {
            eq: true,
            neq: true,
            in: true,
            notIn: false,
            comparison: true,
            between: false,
            booleanComposition: true,
          },
          pagination: { maxPageSize: 100 },
          facets: { resultScoped: true },
          highlights: "parts",
        },
        sorts: { relevance: null, cheapest: null },
        profiles: { default: null },
        toRequest: scoutWireRequest,
        fromResponse: scoutWireResponse,
      }),
    }),
  },
});
```

## Options

| Option            | Required | What it is                                                                                                      |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `endpoint`        | yes      | A URL, or `(request) => string` when the route depends on the request. A function makes `fingerprint` required. |
| `fetch`           | no       | Defaults to `globalThis.fetch`. Throws `SearchConfigurationError` at construction when there is neither.        |
| `headers`         | no       | A record, or `() => record` or `() => Promise<record>`, called once per search.                                 |
| `method`          | no       | `"POST"` (default) or `"GET"`.                                                                                  |
| `capabilities`    | yes      | What your backend can do. There is no default; see below.                                                       |
| `sorts`           | yes      | Every sort name your index declares. The values are yours; `null` is the convention.                            |
| `profiles`        | yes      | Every profile name your index declares, on the same terms.                                                      |
| `toRequest`       | yes      | `(request) => jsonObject`. The body on a `POST`, the query parameters on a `GET`.                               |
| `fromResponse`    | yes      | `(body, request) => AdapterSearchResponse`. The body is the parsed JSON.                                        |
| `fingerprint`     | no       | Defaults to the endpoint with userinfo and query string removed.                                                |
| `reservedOptions` | no       | Provider option keys that collide with something your `toRequest` owns. Defaults to `[]`.                       |

## Capabilities are yours to declare

Only you know whether your endpoint can filter, facet or highlight, so
`capabilities` is required and nothing here guesses it. Declare what the
backend actually implements: the core checks a portable request against it
before dispatch and throws `UnsupportedSearchFeatureError` rather than sending
a search that would come back quietly narrower. `pagination.maxPageSize` is
checked there too, so this adapter never has to clamp a page size.

`cancellation` is the one field with a default. Fetch aborts the connection, so
it is `"transport"` unless you say otherwise. Set `"logical"` when a gateway
replays the request or the backend keeps working after the connection drops:
aborting then stops Scout waiting, and the engine may still compute and bill.

## The two mappings

`toRequest` receives Scout's `AdapterSearchRequest`: `index`, `query`,
`profile`, `sort`, the normalised `filter` AST, `facets`, `highlights`,
`page: { current, size }` and `provider`. `page.current` is one-based.
The mapper returns a JSON object.

`fromResponse` receives the parsed JSON and the same request, and returns an
`AdapterSearchResponse`. The body is `unknown`: validate the response envelope
before mapping it. Scout validates each mapped document against the index
schema separately.

```ts
import { z } from "zod";

const BodySchema = z.object({
  rows: z.array(z.object({ doc: z.unknown(), score: z.number() })),
  matched: z.number().int().nonnegative(),
});

http({
  endpoint: "https://api.example.com/search",
  capabilities,
  sorts: { relevance: null },
  profiles: { default: null },
  reservedOptions: ["q", "from", "size"],
  toRequest: (request) => ({
    q: request.query,
    from: (request.page.current - 1) * request.page.size,
    size: request.page.size,
  }),
  fromResponse: (input, request) => {
    const body = BodySchema.parse(input);
    return {
      hits: body.rows.map((row) => ({
        document: row.doc,
        highlights: {},
        native: row,
      })),
      page: {
        kind: "page",
        current: request.page.current,
        size: request.page.size,
        next:
          request.page.current * request.page.size < body.matched
            ? request.page.current + 1
            : null,
        previous: request.page.current > 1 ? request.page.current - 1 : null,
      },
      total: { value: body.matched, accuracy: "exact", scope: "matches" },
      facets: {},
      took: null,
      native: body,
    };
  },
});
```

## The scout wire format

`scoutWireRequest` and `scoutWireResponse` are a documented default for a
backend you own both ends of. They are opt in: nothing in this package assumes
them, and passing your own pair is the ordinary case rather than the escape
hatch.

The format invents as little as it can. The request is Scout's own request,
field for field, and the response is Scout's own vocabulary back.

### Request

```json
{
  "index": "products",
  "query": "shoe",
  "profile": "default",
  "sort": "relevance",
  "filter": {
    "type": "and",
    "expressions": [
      {
        "type": "comparison",
        "field": "brand",
        "operator": "eq",
        "value": "Apex"
      },
      {
        "type": "comparison",
        "field": "price",
        "operator": "lte",
        "value": 300
      }
    ]
  },
  "facets": ["brand"],
  "highlights": ["title"],
  "page": { "current": 1, "size": 20 },
  "provider": null
}
```

`filter` is the normalised filter AST, which has five node types:

- `{ "type": "constant", "value": true }` matches everything. It only ever
  appears at the root, and `false` never reaches you, because the adapter
  answers a contradiction with an empty page and sends no request.
- `{ "type": "comparison", "field": "price", "operator": "lte", "value": 300 }`
  where the operator is `eq`, `neq`, `in`, `notIn`, `gt`, `gte`, `lt`, `lte` or
  `between`. `in` and `notIn` carry an array, and `between` carries
  `[min, max]`, inclusive at both ends.
- `{ "type": "and", "expressions": [...] }` and `"or"`, each with at least two
  children.
- `{ "type": "not", "expression": {...} }`.

A repeated field answers an operator when any element answers it, which is how
every engine Scout targets reads a filter on an array field.

`provider` is whatever a `.provider()` call passed, and `null` when there was
none.

### Response

```json
{
  "hits": [
    {
      "document": { "id": "1", "title": "Trail running shoe", "price": 120 },
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
      "score": 2.51
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
  "hasMore": true
}
```

| Field        | Required | What it means                                                                                                                                       |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hits`       | yes      | An array. Every entry needs `document`; anything else you put on it, a score included, arrives on `hit.native`.                                     |
| `highlights` | no       | Per field, a list of fragments. `parts` is text and whether it matched, never markup. `path` defaults to the field name and `truncated` to unknown. |
| `total`      | no       | `accuracy` is `"exact"`, `"estimated"` or `"lower-bound"` with a numeric `value`, or `"unknown"`. `scope` is `"matches"` or `"retrievable"`.        |
| `facets`     | no       | Per field, `values` with a numeric `count`. `exhaustive` is what you counted; leaving it out reports `"unknown"`.                                   |
| `took`       | no       | Your own processing time in milliseconds. Leave it out and the core reports its own measurement instead.                                            |
| `hasMore`    | no       | Whether another page exists. Leaving it out derives that from a counted total, and an unknown total leaves `next` as `"unknown"`.                   |

`page.current` and `page.size` are echoed from the request, so there is nothing
to send for them.

Nothing is invented on the way in. A total you do not send is reported as
unknown rather than counted from the page, and a facet that does not say
whether it was exhaustive is reported as `"unknown"`. A body that does not
describe a search at all, a `hits` that is not an array or a total with no
usable accuracy, is refused with a `SearchProviderError` naming the field,
because a broken backend is not a search with no results. Malformed highlight
metadata is the one thing that degrades instead of throwing: a fragment that
cannot be read is dropped, since a fabricated match is worse than no highlight.

## GET

`method: "GET"` sends the same object in the query string. A string value
travels as itself and everything else as JSON, which is the only encoding that
round-trips an array or a nested object, and an `undefined` value is left out.
An endpoint that already has a query string keeps it.

```
GET /search?index=products&query=shoe&filter=%7B%22type%22%3A%22constant%22%2C%22value%22%3Atrue%7D&page=%7B%22current%22%3A1%2C%22size%22%3A20%7D
```

Decode on the backend with `JSON.parse` for every parameter except `index`,
`query`, `profile` and `sort`.

## Credentials

`fingerprint` takes part in the query identity, so it reaches cache keys,
devtools and logs. The default removes both places a credential travels in a
URL, the userinfo and the query string:

```
https://reader:hunter2@api.example.com/search?apiKey=secret
```

becomes `https://api.example.com/search`. A relative endpoint keeps its path
and loses its query string the same way.

Put credentials in `headers`, not in the endpoint. They never appear in a
fingerprint, in an error message or in a query key. An error from a refused
response carries the status and a slice of the response body, and never the
request headers or the URL.

## Errors

| Situation                                | What is thrown                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| No `fetch` and no global one             | `SearchConfigurationError` naming `fetch`, at construction.                       |
| A function `endpoint` and no fingerprint | `SearchConfigurationError` naming `fingerprint`, at construction.                 |
| A non-2xx response                       | `SearchProviderError` with the status and up to 200 characters of the body.       |
| A body that is not JSON                  | `SearchProviderError` saying so, with the `SyntaxError` on `cause`.               |
| Anything your mapping throws             | `SearchProviderError`, unless it is already a Scout error, which keeps its class. |
| An aborted search                        | `SearchAbortedError`, after the connection itself was aborted.                    |

## Native access

`hit.native` is the hit as your `fromResponse` built it, and `result.native` is
the response it was built from. `adapter.native` is the fetch the adapter will
call. A filter that matches nothing answers with `native: null`, because no
request was made and there is nothing to carry.

Provider options reach `toRequest` as `request.provider`, and `reservedOptions`
is where you list the keys of your own body that a provider option must not
overwrite.

## License

[MIT](LICENSE)
