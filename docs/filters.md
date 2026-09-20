---
description: "The operators each field type offers, the filter AST behind them, the normalisation rules that give two equivalent filters one identity, and what an empty set means."
---

# Filters

A filter is built from the field objects the `where` callback receives. Which
operators a field has comes from its type in the schema, so a filter that has no
portable meaning does not compile.

```ts
const result = await products
  .search("boots")
  .where((product, { and, or, not }) =>
    and(
      product.inStock.eq(true),
      product.price.between(50, 200),
      or(product.brand.eq("Sony"), product.brand.eq("Bose")),
      not(product.tags.eq("clearance")),
    ),
  )
  .execute();
```

## Operators per field type

| Field type in the schema | Operators                                                       |
| ------------------------ | --------------------------------------------------------------- |
| `boolean`                | `eq`, `neq`                                                     |
| `string`                 | `eq`, `neq`, `in`, `notIn`                                      |
| `number`                 | `eq`, `neq`, `in`, `notIn`, `gt`, `gte`, `lt`, `lte`, `between` |
| an array of any of those | the element type's operators                                    |

A string has no `between` and a boolean has no ordering, because neither has
semantics these five engines agree on. An array field offers its element
operators, so `tags.eq("sale")` asks whether the array contains that value,
which is how every launch engine reads an equality filter on a repeated field.

`eq` is exact. It is never a partial or analysed match: the Typesense adapter
emits `:=` rather than `:` precisely so that a filter on `red` cannot also
return `dark red`. `between` is inclusive at both ends.

A field the index did not declare filterable is not on the object at all, so
`product.name.eq("x")` is a compile error when `name` was left out of
`filterable`.

## Composing

`and`, `or` and `not` arrive as the second argument. Composition is ordinary
TypeScript, so a conditional filter is an ordinary `if` rather than a `whereIf`
method:

```ts
let search = products.search(text);

if (brands.length > 0) {
  search = search.where((product) => product.brand.in(brands));
}
if (maxPrice !== null) {
  search = search.where((product) => product.price.lte(maxPrice));
}
```

Repeated `where` calls combine with AND. An adapter that declares
`filters.booleanComposition: false` refuses a composed filter before dispatch;
all five launch adapters declare it `true`.

## The AST

The helpers and field objects build a small tree that the adapter translates.
You never write these nodes by hand, but reading one is the fastest way to see
what a filter means:

```ts
type FilterExpression =
  | { type: "and"; expressions: readonly FilterExpression[] }
  | { type: "or"; expressions: readonly FilterExpression[] }
  | { type: "not"; expression: FilterExpression }
  | {
      type: "comparison";
      field: string;
      operator: FilterOperator;
      value: unknown;
    }
  | { type: "constant"; value: boolean };
```

`between` carries `[min, max]` as its value. `constant` is the result of a
filter that resolved without reaching the provider, which is what the empty set
rules below produce.

`normalizeFilter` is exported from the core for tooling and tests. It is the
same function the builder runs, so you can see exactly what a filter becomes.

## Normalisation

Before a request is built, the tree is rewritten into the one shape that stands
for its meaning. This is what makes two searches that filter the same way share
a query identity, and it is why an adapter never has to collapse an empty group
for itself.

| Written                  | Becomes                                                 |
| ------------------------ | ------------------------------------------------------- |
| `in([])`                 | `constant false`, an empty set matches nothing          |
| `notIn([])`              | `constant true`, its negation restricts nothing         |
| `in(["b", "a", "a"])`    | `in(["a", "b"])`, sorted and de-duplicated              |
| `and(a)`                 | `a`                                                     |
| `and(a, and(b, c))`      | `and(a, b, c)`                                          |
| `and()`                  | `constant true`, an empty conjunction restricts nothing |
| `or()`                   | `constant false`, an empty disjunction admits nothing   |
| `not(constant true)`     | `constant false`                                        |
| `and(a, constant false)` | `constant false`, the constant decides the group        |
| `and(a, constant true)`  | `a`, the constant is neutral and disappears             |
| `or(a, constant true)`   | `constant true`                                         |
| no `where` call at all   | `constant true`                                         |

Set values are sorted and de-duplicated by their canonical form rather than by
the value, so `1` and `1` collapse while `"1"` and `1` do not, and a mixed list
stays deterministic. Both membership operators require an array. A malformed
operand throws `SearchConfigurationError`; it is never treated as an empty set.

Nothing beyond this is rearranged. Absorbing a constant is not clever Boolean
algebra, it is what the operators mean, and it lives in the core because no
engine has a literal true or false to write down: leaving it to adapters meant
every adapter reimplemented it and one of them silently narrowed an `or`.

## What a contradiction costs

A filter that normalises to `constant false` matches nothing, and every adapter
answers it without asking the engine. All of them return an empty page with an
exact total of zero, every requested facet present and empty, and never send a
request, because a contradiction has no spelling in most query languages and
asking would be a billed query to be told what the filter already said. Orama
was the last to do this: it used to spend a full corpus scan on it.

That answer is one decision in the core rather than seven, and it is pinned by
the conformance suite. Before it was shared, four adapters answered this
identical search four different ways, disagreeing about the total's scope and
about whether an empty facet counts as exhaustive.

`constant true` means send no filter at all.

## Values the engine cannot take

Operators are checked against the adapter's declared capabilities before
dispatch, and an unsupported one throws `UnsupportedSearchFeatureError` naming
the feature, for example `filters.between`. Nothing is dropped and nothing is
emulated over the page that came back.

Values are the adapter's business, because only the adapter knows the wire
encoding:

- Typesense refuses a filter value that is not a string, a number or a boolean,
  and refuses a range comparison against a string.
- Meilisearch refuses a value it cannot order, such as a `Date` or an object,
  rather than stringifying it into something that would filter on the wrong
  thing. A `null` comparison becomes `IS NULL` or `IS NOT NULL`, because the
  string `"null"` would be a different question.
- Every adapter escapes string values, so a value that spells `acme OR bolt` or
  carries a quote or a backtick stays data instead of becoming syntax.

## Orama filters a string by token

Orama matches a property by the kind its own schema declares. An `enum`,
`number` or `boolean` property is matched by value. A `string` property is
matched by **token**: `where: { brand: "Acme Audio" }` matches every document
whose brand contains `acme` or `audio`, which is not what `eq` means anywhere
else in Scout.

So the Orama adapter refuses a portable filter on a `string`, `string[]`,
`enum[]`, `number[]` or `geopoint` property with `UnsupportedSearchFeatureError`
rather than sending one that would quietly mean something else.

The fix is in the Orama schema, not in your search code:

```ts
const db = create({
  schema: {
    name: "string", // searched, not filtered
    brand: "enum", // filtered exactly
    price: "number",
    inStock: "boolean",
  },
});
```

`product.brand.eq("Acme Audio")` is then the same call it was on Typesense.
[Adapters](adapters.md) has the rest of the per engine differences.

## Filters are not an authorization boundary

A filter is a search parameter. Anyone who can run your page can send a
different one, so per tenant and per user restrictions belong in a restricted
credential issued by the engine. See [security](security.md).
