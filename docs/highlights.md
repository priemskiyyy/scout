---
description: "Highlights arrive as text parts rather than HTML, with the truncation flag, the forgery defence and the UTF-8 offset problem each adapter has to solve."
---

# Highlights

Ask for a highlight by name and every hit carries it.

```ts
const result = await products.search("boot").highlight("name").execute();

for (const fragment of result.hits[0]?.highlights.name ?? []) {
  console.log(fragment.parts);
  // [{ text: "Leather ", matched: false }, { text: "boot", matched: true }]
}
```

`hits[0].highlights.brand` does not compile, because the search never requested
it, and `.highlight("brand")` does not compile either, because `brand` was never
declared highlightable on the index.

## Parts, not markup

```ts
type HighlightPart = { text: string; matched: boolean };

type HighlightFragment = {
  path: readonly (string | number)[];
  parts: readonly HighlightPart[];
  truncated: boolean | "unknown";
};
```

Rendering is the application's:

```tsx
parts.map((part) => (part.matched ? <mark>{part.text}</mark> : part.text));
```

Scout never returns markup, so nothing in a document and nothing in a query can
inject HTML through a highlight. A title that genuinely contains
`Lamp with <em>markup</em> inside` comes back with those angle brackets sitting
in an unmatched part, as text, because that is what the document says. Rendering
it as text is then the default rather than the thing you remembered to do.

This only holds for the highlight path. `hit.document` is your own validated
document and `hit.native` is the engine's raw hit, and both carry whatever was
indexed.

## `path` locates the value

`path` is where the highlighted value sits inside the document. A plain field is
`["name"]`. An array field gives one fragment per matching element with its
index, so `["tags", 2]` is the third tag.

That is why `highlights.name` is an array rather than a single fragment: one
requested field can highlight several values.

## A requested field is always present

```ts
result.hits[0]?.highlights.name; // [] when the engine highlighted nothing
```

The core fills an empty array for every field the search requested, so rendering
never checks for `undefined`. An empty array means the engine matched nothing
in that field, which is the truth rather than a gap.

## `truncated` says whether the value was cut

- `false`: the fragment carries the whole field value.
- `true`: the engine cut it short.
- `"unknown"`: the engine did not say.

Typesense reports `false` for a whole field value and `"unknown"` for a snippet
window or an array element, because it never says how much it left out.
[Adapters](adapters.md) says what the others report.

Treat `"unknown"` as "do not append an ellipsis and do not claim this is the
full value".

## A document cannot forge a match

An engine marks a match by wrapping it in tags, so the adapter has to tell a tag
it asked for apart from text that was indexed. A fixed tag such as `<mark>` or
`<em>` cannot do that: a document indexed with the tag in it would produce a
match the engine never found.

So an adapter asks for markers made for that one search, with
`createHighlightMarkers()` from `@priemskiyyy/scout/adapter`, and splits the
engine's answer on them with `splitHighlight()`. A marker chosen after the
document was written cannot be forged by that document. The markers are ASCII,
built around `crypto.randomUUID()` where it exists and two random draws on a
runtime without it, such as an older Hermes build.

Malformed metadata degrades the same way everywhere. An opening marker with no
closing one, a closing marker with no opening one, or a pair nested inside
another becomes a single unmatched part carrying the plain text with the
markers removed. No adapter throws over a highlight, because a broken highlight
is not a reason to fail a search that otherwise answered.

The conformance suite holds every adapter to the invariant that matters:
rejoining a whole fragment's parts gives back exactly the field, which catches
a leaked marker and a corrupted slice at once.

## The Unicode problem

Some engines report match positions as UTF-8 byte offsets. JavaScript string
indexes are UTF-16 code units, so those numbers are not interchangeable:
slicing a string by them corrupts any accented, CJK or emoji text, and the
corruption only appears for the documents that contain such text.

That is the other reason adapters split on markers. Splitting is plain string
slicing at positions the engine itself produced, and an ASCII marker can never
be found inside a surrogate pair, so an astral character, a combining mark or a
joined emoji sequence cannot be cut at one of those boundaries.

If you write an adapter, prefer markers over offset arithmetic. If an engine
gives you nothing but offsets, find out which encoding they count in before
slicing anything.

## An engine without highlights refuses them

```ts
await localProducts.search("boot").highlight("name").execute();
// ScoutError { code: "unsupported-feature" }
```

An engine that reports no match positions has no honest parts to give, so its
adapter refuses a search that asks for highlights, before anything runs.
Parts built without positions would be guesses. [Adapters](adapters.md) says
which engines refuse.

If you need highlighting over a local corpus, highlight in the application from
the query you already have, and treat it as your own approximation rather than
something the engine reported.

[The search builder](search-builder.md) shows where `.highlight()` sits in a
chain.
