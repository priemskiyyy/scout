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
index, so `["tags", 2]` is the third tag. A nested object field reports each key
it walked through.

That is why `highlights.name` is an array rather than a single fragment: one
requested field can highlight several values.

## A requested field is always present

```ts
result.hits[0]?.highlights.name; // [] when the engine highlighted nothing
```

The core fills an empty array for every field the search requested, so rendering
never checks for `undefined`. An empty array means the provider matched nothing
in that field, which is the truth rather than a gap.

## `truncated` says whether the value was cut

- `false`: the fragment carries the whole field value.
- `true`: the engine cut it short.
- `"unknown"`: the engine did not say.

| Adapter     | What it reports                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Typesense   | `false` for a whole field value, `"unknown"` for a snippet window or an array element, because Typesense never says how much it left out |
| Algolia     | `false`, because the adapter reads `_highlightResult`, which carries the whole attribute, and never requests `_snippetResult`            |
| Meilisearch | `false` when nothing was cropped, `"unknown"` when the search asked for cropping, because Meilisearch does not report whether it cropped |

Treat `"unknown"` as "do not append an ellipsis and do not claim this is the
full value".

## A document cannot forge a match

An engine marks a match by wrapping it in tags, so the adapter has to tell a tag
it asked for apart from text that was indexed. Each adapter solves that, and not
in the same way.

Algolia and Meilisearch generate an unguessable marker per search and pass it as
the pre and post tag, instead of Algolia's default `<em>`. Algolia inserts the
tags verbatim and escapes nothing, so a document indexed with `<em>` in it would
otherwise produce a match that was never found, and so would a document indexed
with a fixed marker. A marker chosen after the document was written cannot be
forged by that document.

Typesense sets `highlight_start_tag` and `highlight_end_tag` to `<mark>` and
`</mark>`, then checks the parsed parts for a marker that leaked through. A hit
whose text contains those tags does not produce a fabricated match; the fragment
degrades to one unmatched part carrying the plain text with the markers removed.
That is a weaker guarantee than an unguessable marker: the match positions in
such a document are lost rather than wrong.

Malformed metadata degrades the same way everywhere. An opening marker with no
closing one, a closing marker with no opening one, or a value that does not read
as balanced markers becomes a single unmatched part carrying the plain text. No
adapter throws over a highlight, because a broken highlight is not a reason to
fail a search that otherwise answered.

## The Unicode problem

Meilisearch can report match positions two ways, and one of them is a trap.
`_matchesPosition` gives `start` and `length` as UTF-8 byte offsets. JavaScript
string indexes are UTF-16 code units, so those numbers are not interchangeable:
slicing a string by them corrupts any accented, CJK or emoji text, and the
corruption only appears for the documents that contain such text.

The adapter does not request `_matchesPosition`. It sets its own
`highlightPreTag` and `highlightPostTag` and splits the formatted value on those
markers, which is plain string slicing at positions the engine itself produced
and cannot cut a character in half.

Typesense parses markers the same way and for the same reason. Both markers are
ASCII, so a marker can never be found inside a surrogate pair, and an astral
character, a combining mark or a joined emoji sequence cannot be split at one of
those boundaries.

If you write an adapter, prefer markers over offset arithmetic. If an engine
gives you nothing but offsets, find out which encoding they count in before
slicing anything.

## Two engines have no highlights at all

Orama and MiniSearch both declare `highlights: "none"`:

```ts
await localProducts.search("boot").highlight("name").execute();
// UnsupportedSearchFeatureError: The orama adapter does not report highlights.
```

Orama's keyword search reports no match offsets. MiniSearch's `match` says which
fields a term was found in and never where in the text, and the tokenizer and
term processor that would be needed to find the position again belong to the
instance and are not exposed. Parts built from either would be guesses, so the
search is refused instead. Every hit from those adapters carries an empty
highlight record, and asking for one throws before the search runs.

If you need highlighting over a local corpus, highlight in the application from
the query you already have, and treat it as your own approximation rather than
something the engine reported.

[Adapters](adapters.md) compares the engines, and
[the search builder](search-builder.md) shows where `.highlight()` sits in a
chain.
