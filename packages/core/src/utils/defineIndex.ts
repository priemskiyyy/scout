import type { AdapterSort } from "src/types/AdapterSort";
import type { FacetTypes } from "src/types/FacetTypes";
import type { FacetValueType } from "src/types/FacetValueType";
import type { IndexDeclaration } from "src/types/IndexDeclaration";
import type { IndexDefinition } from "src/types/IndexDefinition";
import type { ProfileDefinition } from "src/types/ProfileDefinition";
import type { SortDefinition } from "src/types/SortDefinition";
import type { SortDirection } from "src/types/SortDirection";
import type { TextFieldOf } from "src/types/TextFieldOf";
import { ScoutError } from "src/utils/ScoutError";

// The one rule the types cannot state: a sort has to order by something.
const getSortBy = (
  name: string,
  definition: Readonly<Record<string, SortDirection>>,
): AdapterSort["by"] => {
  const by = Object.entries(definition).map(([field, direction]) =>
    Object.freeze({ field, direction }),
  );

  if (by.length === 0) {
    throw new ScoutError({
      code: "configuration",
      message: `sorts.${name} must order by at least one field.`,
    });
  }

  return Object.freeze(by);
};

// "relevance" is the engine's own order, which every index has.
const getSorts = (
  sorts: Readonly<Record<string, Readonly<Record<string, SortDirection>>>>,
): Readonly<Record<string, AdapterSort | null>> => {
  const resolved: Array<[string, AdapterSort | null]> = [["relevance", null]];

  for (const [name, definition] of Object.entries(sorts)) {
    resolved.push([
      name,
      Object.freeze({ name, by: getSortBy(name, definition) }),
    ]);
  }

  return Object.freeze(Object.fromEntries(resolved));
};

// "default" searches the index's own searchable fields.
const getProfiles = (
  searchable: readonly string[],
  profiles: Readonly<
    Record<string, { readonly searchable: readonly string[] }>
  >,
): Readonly<Record<string, readonly string[]>> => {
  const resolved: Array<[string, readonly string[]]> = [
    ["default", searchable],
  ];

  for (const [name, definition] of Object.entries(profiles)) {
    resolved.push([name, Object.freeze([...definition.searchable])]);
  }

  return Object.freeze(Object.fromEntries(resolved));
};

/**
 * Declares one index: its schema, the fields a search can use, and its named
 * sorts and profiles. It names no engine; the `Scout` it is registered with
 * binds an adapter to it.
 *
 * @example
 * ```ts
 * const products = index({
 *   schema: ProductSchema,
 *   id: (product) => product.id,
 *   searchable: ["name", "brand"],
 *   filterable: ["brand", "price", "inStock"],
 *   facetable: { brand: "string" },
 *   highlightable: ["name"],
 *   sorts: { priceAsc: { price: "asc" } },
 * });
 * ```
 */
export const index = <
  TDocument,
  const TSearchable extends TextFieldOf<TDocument>,
  const TFilterable extends keyof TDocument & string = never,
  const TFacets extends FacetTypes<TDocument> = Record<never, never>,
  const THighlightable extends keyof TDocument & string = never,
  const TSorts extends Readonly<Record<string, SortDefinition<TDocument>>> =
    Record<never, never>,
  const TProfiles extends Readonly<
    Record<string, ProfileDefinition<TextFieldOf<TDocument>>>
  > = Record<never, never>,
>({
  schema,
  id,
  searchable,
  filterable = [],
  facetable,
  highlightable = [],
  sorts,
  profiles,
  validate = "error",
}: IndexDefinition<
  TDocument,
  TSearchable,
  TFilterable,
  TFacets,
  THighlightable,
  TSorts,
  TProfiles
>): IndexDeclaration<
  TDocument,
  TFilterable,
  keyof TFacets & string,
  THighlightable,
  "relevance" | (keyof TSorts & string),
  "default" | (keyof TProfiles & string)
> => {
  const defaultFields: readonly string[] = Object.freeze([...searchable]);

  const declaredFacets: Readonly<Record<string, FacetValueType>> =
    Object.freeze({ ...facetable });

  // Built from the caller's own keys, so each is typed by the declaration.
  const resolvedSorts: Readonly<
    Record<"relevance" | (keyof TSorts & string), AdapterSort | null>
  > = getSorts(sorts ?? {});

  const resolvedProfiles: Readonly<
    Record<"default" | (keyof TProfiles & string), readonly string[]>
  > = getProfiles(defaultFields, profiles ?? {});

  const facetTypes: Readonly<Record<keyof TFacets & string, FacetValueType>> =
    declaredFacets;

  return Object.freeze({
    schema,
    id,
    filterable: Object.freeze([...filterable]),
    facetable: facetTypes,
    highlightable: Object.freeze([...highlightable]),
    sorts: resolvedSorts,
    profiles: resolvedProfiles,
    validate,
  });
};
