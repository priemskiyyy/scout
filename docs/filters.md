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
semantics these engines agree on. An array field offers its element operators,
so `tags.eq("sale")` asks whether the array contains that value, which is how
every engine reads an equality filter on a repeated field.

`eq` is exact. It is never a partial or analysed match: the Typesense adapter
emits `:=` rather than `:` precisely so that a filter on `red` cannot also
return `dark red`. `between` is inclusive at both ends, and one with its bounds
the wrong way round is refused as you build it, because every engine answers it
with nothing and no error.

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

Repeated `where` calls combine with AND. An engine whose grammar cannot express
a tree refuses it with `"unsupported-feature"` rather than sending something
else. Algolia, for one, cannot put an AND inside an OR.

## The AST

The helpers and field objects build a small tree that the adapter translates:

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
    };
```

`FilterOperator` is `"eq"`, `"neq"`, `"in"`, `"not-in"`, `"gt"`, `"gte"`,
`"lt"`, `"lte"` or `"between"`, and `between` carries `[min, max]` as its
value. A `where` callback may also return a tree it built by hand. Its fields
are still checked against `filterable` when the search runs, and one the index
did not declare is a `"configuration"` error rather than a filter the engine
would quietly apply.

## Normalisation

Before a request is built, the tree is rewritten into the one shape that stands
for its meaning. This is what makes two searches that filter the same way share
a query identity, and it is why an adapter never has to collapse an empty group
for itself.

| Written                | Becomes                                                |
| ---------------------- | ------------------------------------------------------ |
| `in([])`               | nothing matches, an empty set holds no value           |
| `notIn([])`            | no restriction, its negation excludes no value         |
| `in(["b", "a", "a"])`  | `in(["a", "b"])`, sorted and de-duplicated             |
| `and(a)`               | `a`                                                    |
| `and(a, and(b, c))`    | `and(a, b, c)`                                         |
| `and()`                | no restriction, an empty conjunction restricts nothing |
| `or()`                 | nothing matches, an empty disjunction admits nothing   |
| `not(notIn([]))`       | nothing matches                                        |
| `and(a, in([]))`       | nothing matches, the empty set decides the group       |
| `and(a, notIn([]))`    | `a`, the empty negation disappears                     |
| `or(a, notIn([]))`     | no restriction                                         |
| no `where` call at all | no restriction                                         |

Set values are sorted and de-duplicated by their canonical form rather than by
the value, so `1` and `1` collapse while `"1"` and `1` do not, and a mixed list
stays deterministic. Both membership operators require an array. A malformed
operand is a `"configuration"` error; it is never treated as an empty set, and
every operand is checked, even one after a member that already decided the
group.

Nothing beyond this is rearranged. Deciding a group is not clever Boolean
algebra, it is what the operators mean, and it lives in the core because no
engine has a literal true or false to write down: leaving it to adapters meant
every adapter reimplemented it and one of them silently narrowed an `or`.

## What an adapter receives

A filter that restricts nothing reaches the adapter as `null`, so it sends no
filter at all. A filter that can match nothing never reaches the adapter: the
core answers it with an empty page, an exact total of zero and every requested
facet present, empty and exhaustive, because an empty set is counted
completely. `result.native` is `null` then, because the engine was never asked.
A contradiction has no spelling in most query languages, and asking would be a
billed query to be told what the filter already said.

Anything else arrives normalised: every group has at least two members and none
of its own kind, and set operands are sorted and de-duplicated. The two
constants still take part in the query identity, so a search that matches
nothing and one that restricts nothing never share a cache entry.

## Values the engine cannot take

Each comparison carries the value its operator compares with: a string, a
number or a boolean for `eq` and `neq`, a list of them for `in` and `notIn`,
a number for a range, and a `[min, max]` pair for `between`. A filter built by
hand with the wrong value does not compile, and the core refuses `NaN` and an
infinite number before any adapter sees them, so no adapter checks an operand's
type. Encoding the value is the adapter's business, because only the adapter
knows the wire format:

- An adapter refuses a value its engine cannot encode rather than stringifying
  it into something that filters on the wrong thing, as Orama does for a
  string for a `number` property.
- Every adapter escapes string values, so a value that spells `acme OR bolt` or
  carries a quote or a backtick stays data instead of becoming syntax. The
  conformance suite sends a quote, a backslash and a colon to every adapter to
  hold it to that.

What an operator the engine lacks becomes is a refusal with
`"unsupported-feature"`, never a filter dropped or emulated over the page that
came back. [Adapters](adapters.md) says what each engine refuses, including
the Orama rule for filtering a string property exactly.

## Filters are not an authorization boundary

A filter is a search parameter. Anyone who can run your page can send a
different one, so per tenant and per user restrictions belong in a restricted
credential issued by the engine. See [security](security.md).
