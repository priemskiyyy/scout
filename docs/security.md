---
description: "Restricted credentials, one Scout instance per security context, why no token may reach a query key, and what server rendering needs."
---

# Security

A Scout filter is a search parameter, not an authorization boundary. The search
below asks the engine for one kind of product, and the engine will happily
answer a different question if someone asks it directly with the same key.

```ts
const visible = await products
  .search(text)
  .where((product) => product.inStock.eq(true))
  .execute();
```

Anything that runs in a browser ships its key and its filters to the user. Both
are editable. What actually restricts an answer is the credential.

## Use the engine's restricted credentials

Every remote engine has a way to bind a restriction to a key, and that is where
a per tenant or per user rule belongs:

- Typesense scoped search keys, which embed `filter_by` in the key itself.
- Algolia secured API keys, which embed `filters` and `restrictIndices`.
- Meilisearch tenant tokens, which embed a filter per index.
- MongoDB Search, Elasticsearch and OpenSearch run only on a server, behind
  your own endpoint, so their credentials never reach a browser. The roles of
  the user or key your server connects with bound what that endpoint can read,
  and a per tenant rule is a filter your server adds before it searches.
- Orama, MiniSearch and Fuse.js run in the process that searches them, so the
  corpus in memory is the boundary. Do not load documents into a client side
  index that the person at the keyboard is not allowed to read.

Mint the restricted credential on your server, hand it to the client, and build
the Scout instance with it. Keep write, admin and index management keys out of
anything that reaches a browser. A search only key that can read the whole index
is still a decision, not an accident, and it is a reasonable one for a public
catalogue.

The failure condition is worth naming: if the key can read everything, no filter
Scout builds changes that, including a filter you wrote on the server and
serialised into the page.

## One Scout per security context

`Scout` holds no results and no cache. Its only state is whether it has been
disposed, and it borrows the engine client rather than owning it. So swapping
security context is not a cache flush, it is a new instance.

```ts
const handleSignOut = () => {
  scout.dispose();
  queryClient.clear();
};
```

On an account change, a tenant change or a permission change, dispose the
instance built with the old credentials and construct a new one with the new
ones. `dispose()` is synchronous and idempotent, and it disposes every adapter.
A search already in flight rejects at once with a `ScoutError` whose code is
`"disposed"`, and an answer that arrives later is refused, so a response
computed under the previous credentials cannot reach the new session. Clients
that the application injected are left open, because Scout did not open them.

A `QueryClient` cache is shared by everything that uses it, and query keys are
not a security boundary either. Separate per user results by giving each
security context its own `QueryClient`, or by clearing the one you have, rather
than by adding a user id to a key.

## No credential may reach a query key

An adapter's `fingerprint()` is part of the query identity, so it reaches cache
keys, logs and any devtools that print them. It names what changes results and
is not part of the request: the collection or index name, a local corpus
revision. It must never carry an API key, a tenant token or a session
identifier, and the conformance suite fails an adapter whose fingerprint binds a
name like `apiKey` or `token` to a value.

The same rule covers `.provider()`. Every provider option is canonicalised into
the key, so a token passed as a provider option is a token in your cache key and
in every log line that prints it. See
[query identity](internals/query-identity.md) for what is in a key and what is
not, and [native access](native-access.md) for the provider option rules.

If a credential is genuinely part of what an answer depends on, for instance
because a scoped key pins a tenant, change the instance rather than the key: a
new `Scout` built on a new client for the new tenant, with its own
`QueryClient`.

## Server rendering

Scout has no module-level mutable state and reads no `process.env` anywhere, so
a request scoped instance is safe by construction. Build one `Scout` per request
on the server, next to the per request `QueryClient` you already build, instead
of exporting a module singleton that every request shares.

```ts
export const createRequestScope = (searchKey: string) => {
  const client = new SearchClient({ nodes, apiKey: searchKey });

  const scout = new Scout({
    indexes: { products },
    adapters: { products: typesense({ client, collection: "products" }) },
  });

  return { scout, queryClient: new QueryClient() };
};
```

The index declaration is shared safely, because it is frozen and holds no
credential. Two rules follow. A server instance holding an admin or write key
must never serve results that a client then hydrates and refetches with its own
key, because the first render would show more than the second. And a dehydrated
cache carries whatever the server query returned, so dehydrate only what the
current user is allowed to see. See [TanStack Query](tanstack-query.md) for how
the keys are built.

## Highlights cannot inject markup

Scout returns highlights as `{ text, matched }` parts and never as an HTML
string. Adapters that wrap matches in markers make those markers per search, so
a document carrying marker shaped text cannot forge a match, and text that
looks like markup stays text.

```tsx
import type { HighlightFragment } from "@priemskiyyy/scout";

export const Highlighted = ({ fragment }: { fragment: HighlightFragment }) => (
  <>
    {fragment.parts.map((part, position) =>
      part.matched ? (
        <mark key={position}>{part.text}</mark>
      ) : (
        <span key={position}>{part.text}</span>
      ),
    )}
  </>
);
```

The failure condition is an application that joins the parts back into a string
and renders it with `dangerouslySetInnerHTML` or `v-html`. That reintroduces
exactly the injection the parts exist to prevent. See
[highlights](highlights.md).

## What is proven, and what is not

Adapter behaviour is covered by the shared conformance suite and by per adapter
tests. The in-process engines run their tests against the real engine holding
real documents. The remote engines are tested against an in-process fake of the
client shape, with a contracts file pinning that fake to the real SDK types, so
what those tests prove is the request that was built and not the answer a
running server would give. [Verification](verification.md) is the matrix, and
none of it says anything about your key policy, which is yours to verify.
