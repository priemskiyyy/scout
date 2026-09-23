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

The canonical request is built from the search after it was resolved against
its index, so it holds what the adapter will receive rather than what was
typed:

| Value                    | Notes                                                                       |
| ------------------------ | --------------------------------------------------------------------------- |
| the adapter fingerprint  | what changes results without being in the request                           |
| the query text           | exactly as passed, never trimmed, and empty to browse                       |
| the searchable fields    | the ones the selected profile runs the query against                        |
| the profile name         | the one selected, or `"default"`                                            |
| the sort                 | its definition, the name and the fields it orders by, or none for relevance |
| the filter               | normalised, so equivalent filters collapse to one form                      |
| the requested facets     | de-duplicated and sorted                                                    |
| the requested highlights | de-duplicated and sorted                                                    |
| the page number          | one-based                                                                   |
| the page size            | part of base identity, for normal and infinite queries alike                |
| the provider options     | the whole payload, canonicalised like any other value                       |

A few consequences worth naming. The sort's definition and the profile's fields
are in, so a search over a declaration that changed never reuses a cache entry
made before the change. The filter keeps its two constants, so a filter that
matches nothing and one that restricts nothing, which both reach an adapter as
no filter at all, never share an entry. Repeating a facet costs the engine
nothing but would change a naive key, so the requested set is de-duplicated and
sorted before it gets here. And provider options are in, so two searches that
differ only in a `.provider()` payload never share a cache entry, even when the
option is something you believe does not change results.

## The adapter fingerprint

`fingerprint()` carries what changes the answer but is not part of the request.
Typesense reports its collection name. An engine that serves sorts from its own
configuration includes that mapping, because the same sort name over a
different replica is a different result set. A local engine includes a corpus
revision the application supplies, because a corpus changes in the same process
with nothing in between to notice it, and Scout does not watch your data.
[Adapters](../adapters.md) says what each one reports.

A fingerprint must never contain a credential. It reaches cache keys, logs and
devtools. See [security](../security.md).

## What is deliberately left out

- Credentials of any kind, including anything inside an injected client.
- The adapter's name. Only its fingerprint takes part, so two different adapters
  that report the same fingerprint for the same index name would collide. Give
  each one a fingerprint that identifies its target.
- The `AbortSignal`, because it changes nothing about what a search means.
- The index's `validate` setting and its schema. They decide how an answer is
  read, not what is asked, and the index name is already in the key.
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

These are refused with a `ScoutError` whose code is `"configuration"` and whose
message names exactly where the offending value sat, for example
`provider.transform`:

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
`in(["Sony", "Bose"])` and `in(["Bose", "Sony"])` share a key and why `and(a)`
and `a` share one. The full list of rewrites is in [filters](../filters.md).

## When two keys are equal and should not be

The identity is a statement about the request, not about the data behind it. It
cannot see:

- a remote index that was reindexed, which is why a remote adapter has no
  revision and why `staleTime` and invalidation exist;
- a local corpus that changed without its revision being bumped, which is the
  one failure mode that looks like caching working perfectly and returning last
  week's answers;
- a credential that changed while the index name stayed the same. Dispose the
  `Scout` and build a new one instead.
