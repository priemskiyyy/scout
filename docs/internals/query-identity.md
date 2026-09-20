---
description: "How Scout turns one search into a canonical key, which values take part, which are deliberately left out, and what happens to a value that has no canonical form."
---

# Query identity

Every search has a canonical identity: one array that stands for what the search
means. Two searches that mean the same thing produce the same identity, and two
that differ in anything that changes results do not.

```ts
const left = products.search("shoe").where((p) => p.brand.in(["Bose", "Sony"]));
const right = products
  .search("shoe")
  .where((p) => p.brand.in(["Sony", "Bose"]));

left.key(); // ["scout", "products", "{...}"]

JSON.stringify(left.key()) === JSON.stringify(right.key()); // true
```

`key()` is what the TanStack Query integration uses as a query key, and it is
public on its own because an identity is just as useful for a log, a trace or a
cache of your own. Never build one by hand.

## The shape

```ts
["scout", indexName, canonicalRequest];
```

The namespace is always `"scout"`, so invalidating by that prefix reaches every
Scout query. The index name is separate so a per index invalidation is a two
element prefix. The third element is one string that stands for everything else.

The infinite query in `@priemskiyyy/scout-tanstack-query` inserts an
`"infinite"` segment after the namespace, because there the page number is the
page parameter and must not be part of the key. See
[TanStack Query](../tanstack-query.md).

## What takes part

The canonical request is built from exactly these, in a fixed order:

| Value                    | Notes                                                           |
| ------------------------ | --------------------------------------------------------------- |
| the adapter fingerprint  | what changes results without being in the request               |
| the index name           | the declared name, not the handle                               |
| the query text           | exactly as passed, never trimmed                                |
| the profile name         | the one selected, or the index's first declared profile         |
| the sort name            | the one selected, or the index's first declared sort            |
| the filter               | after normalisation, so equivalent filters collapse to one form |
| the requested facets     | de-duplicated and sorted                                        |
| the requested highlights | de-duplicated and sorted                                        |
| the page number          | one-based                                                       |
| the page size            | part of base identity, for normal and infinite queries alike    |
| the provider options     | the whole payload, canonicalised like any other value           |

Two consequences worth naming. Repeating a facet costs the provider nothing but
would change a naive key, so the requested set is de-duplicated and sorted
before it gets here. And provider options are in, so two searches that differ
only in a `.provider()` payload never share a cache entry, even when the option
is something you believe does not change results.

## The adapter fingerprint

`fingerprint()` carries what changes the answer but is not part of the request.
Each adapter contributes something different:

| Adapter     | Fingerprint                                               |
| ----------- | --------------------------------------------------------- |
| Typesense   | the collection name                                       |
| Algolia     | the primary index name plus every sort to replica mapping |
| Meilisearch | the index uid                                             |
| Orama       | `orama:` and the corpus revision you supply               |
| MiniSearch  | `minisearch:` and the corpus revision you supply          |

Algolia includes the replica mapping because the same sort name over a different
replica is a different result set. The two local engines include a revision
because a corpus changes in the same process with nothing in between to notice
it, and Scout does not watch your database.

A fingerprint must never contain a credential. It reaches cache keys, logs and
devtools. See [security](../security.md).

## What is deliberately left out

- Credentials of any kind, including anything inside a provider client.
- The adapter's name. Only its fingerprint takes part, so two different adapters
  that report the same fingerprint for the same index name would collide. Give
  each one a fingerprint that identifies its target.
- The `AbortSignal`, because it changes nothing about what a search means.
- The index's `validate` and `emptyQuery` settings and its schema. They are
  properties of the index, and the index name is already in the key.
- Anything about the answer: hit count, totals, timings, facet values.

## Canonicalisation rules

The canonical form is a string built by walking the value. The rules exist so
that two values that mean the same thing produce the same string:

| Value                                | Canonical form                                                        |
| ------------------------------------ | --------------------------------------------------------------------- |
| `null`                               | `null`                                                                |
| a string                             | JSON quoted, so quotes and backslashes are escaped                    |
| a number                             | its decimal form, and `-0` collapses into `0`                         |
| a boolean                            | `true` or `false`                                                     |
| a bigint                             | its digits with an `n` suffix                                         |
| a `Date`                             | its ISO string, quoted                                                |
| an array                             | positional, `[a,b,c]`                                                 |
| a plain object                       | own enumerable keys, sorted, `{"a":1,"b":2}`                          |
| an object member that is `undefined` | omitted, so `{ a: 1 }` and `{ a: 1, b: undefined }` share an identity |

Object keys are sorted because `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` are the
same object. Array order is kept because `[1, 2]` and `[2, 1]` are not the same
list. An `undefined` member is dropped because an absent option and an option
set to `undefined` mean the same thing, while an `undefined` array element is
refused, because a hole in a sequence is not the same as a shorter sequence.

## Values with no canonical form

These are refused with a `SearchConfigurationError` whose `path` names exactly
where the offending value sat, for example `search.provider.transform`:

`NaN`, an infinite number, a function, a symbol, `undefined`, an invalid `Date`,
and any object that is not a plain object, which is reported by its constructor
name. Circular references and sparse array holes are also refused. Shared
subtrees that are not cycles remain valid.

Refusing is the point. Silently dropping the value would let two different
searches share one cache entry and serve each other's results; silently
including it by reference would make every key unique and cache nothing. If you
need such a value in a provider option, replace it with plain data, or move what
it stands for into the adapter's fingerprint.

## Filter normalisation comes first

The filter in the key is the normalised one, which is why
`in(["Sony", "Bose"])` and `in(["Bose", "Sony"])` share a key, why `and(a)` and
`a` share one, and why an empty `in([])` and an explicit contradiction share
one. The full list of rewrites is in [filters](../filters.md).

## When two keys are equal and should not be

The identity is a statement about the request, not about the data behind it. It
cannot see:

- a remote index that was reindexed, which is why a remote adapter has no
  revision and why `staleTime` and invalidation exist;
- a local corpus that changed without its `revision` being bumped, which is the
  one failure mode that looks like caching working perfectly and returning last
  week's answers;
- a credential that changed while the index name stayed the same. Dispose the
  `Scout` and build a new one instead.

## The low level entry point

```ts
import { searchKey } from "@priemskiyyy/scout";
```

`searchKey(request, fingerprint)` is what `key()` calls. It takes an
`AdapterSearchRequest`, which is the shape an adapter receives, so it is useful
inside an adapter, a test or a devtool that already holds one. In application
code, call `search.key()` and let the builder assemble the request.
