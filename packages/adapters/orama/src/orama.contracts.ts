import { create, search } from "@orama/orama";
import type {
  FacetsParams,
  Result,
  Results,
  SorterParams,
  TypedDocument,
  WhereCondition,
} from "@orama/orama";
import { expectTypeOf } from "vitest";
import { orama } from "src/orama";
import type { OramaDatabase } from "src/types/OramaDatabase";
import type { OramaFacetDefinition } from "src/types/OramaFacetDefinition";
import type { OramaHit } from "src/types/OramaHit";
import type { OramaResponse } from "src/types/OramaResponse";
import type { OramaSearchParams } from "src/types/OramaSearchParams";
import type { OramaSearchProfile } from "src/types/OramaSearchProfile";
import type { OramaSearchSort } from "src/types/OramaSearchSort";

export const contractDatabase = create({
  schema: {
    name: "string",
    brand: "enum",
    price: "number",
    inStock: "boolean",
  },
});

export type ContractSchema = (typeof contractDatabase)["schema"];

export type ContractDocument = TypedDocument<typeof contractDatabase>;

// A real Orama database carries everything the adapter reads from it, so the
// structural type is a view of the real one rather than a parallel invention.
expectTypeOf(contractDatabase).toExtend<OramaDatabase>();

// Orama's own `search` is accepted as it is, with no wrapper and no cast at the
// call site. That is the whole point of injecting it.
export const contractAdapter = orama({
  db: contractDatabase,
  search,
  revision: () => 1,
  profiles: { default: {}, names: { properties: ["name"] } },
  sorts: { relevance: {}, priceAsc: { sortBy: { property: "price" } } },
});

expectTypeOf(contractAdapter.native).toEqualTypeOf<typeof contractDatabase>();

// The declared names survive, so an index can require the adapter to cover
// every sort and profile it declares.
expectTypeOf(contractAdapter.sorts).toExtend<{
  relevance: OramaSearchSort;
  priceAsc: OramaSearchSort;
}>();
expectTypeOf(contractAdapter.profiles).toExtend<{
  default: OramaSearchProfile;
  names: OramaSearchProfile;
}>();

// Orama answers synchronously or with a promise; Scout promises a promise.
expectTypeOf(contractAdapter.search).returns.toExtend<Promise<unknown>>();

export type ContractHit = Awaited<
  ReturnType<(typeof contractAdapter)["search"]>
>["hits"][number]["native"];

// Orama's own document type reaches the native hit, so `hit.native` is typed
// by the schema the application declared rather than by `unknown`.
expectTypeOf<ContractHit>().toEqualTypeOf<OramaHit<ContractDocument>>();

// What Orama answers with is readable as what the adapter reads.
expectTypeOf<Results<ContractDocument>>().toExtend<
  OramaResponse<ContractDocument>
>();
expectTypeOf<Result<ContractDocument>>().toExtend<OramaHit<ContractDocument>>();

// Every clause the adapter builds is one Orama's own `where` admits. These are
// the only shapes it emits, which is why the loose `where` on
// `OramaSearchParams` costs nothing: the construction side stays pinned.
expectTypeOf<{ brand: { eq: string } }>().toExtend<
  WhereCondition<ContractSchema>
>();
expectTypeOf<{ inStock: boolean }>().toExtend<WhereCondition<ContractSchema>>();
expectTypeOf<{ price: { gte: number } }>().toExtend<
  WhereCondition<ContractSchema>
>();
expectTypeOf<{ price: { between: [number, number] } }>().toExtend<
  WhereCondition<ContractSchema>
>();
expectTypeOf<{ and: [] }>().toExtend<WhereCondition<ContractSchema>>();
expectTypeOf<{ not: { and: [] } }>().toExtend<WhereCondition<ContractSchema>>();
expectTypeOf<{
  or: [{ brand: { eq: string } }, { brand: { eq: string } }];
}>().toExtend<WhereCondition<ContractSchema>>();

// The facet definition and the sort the adapter emits are Orama's own.
expectTypeOf<Record<"brand", OramaFacetDefinition>>().toExtend<
  FacetsParams<typeof contractDatabase>
>();
expectTypeOf<Required<OramaSearchSort>["sortBy"]>().toExtend<
  SorterParams<typeof contractDatabase>
>();

// @ts-expect-error a database the adapter cannot read a schema from
export const withoutSchema: OramaDatabase = { id: "products" };

// @ts-expect-error Orama has no negated equality on a property condition
export const negated: WhereCondition<ContractSchema> = { price: { neq: 199 } };

// @ts-expect-error Orama matches a string property by token, never by value
export const byValue: WhereCondition<ContractSchema> = { name: { eq: "a" } };

export const vectorParams: OramaSearchParams = {
  term: "headphones",
  // The directive sits on the line the error is reported on, which for an
  // object literal is the offending property and not the declaration.
  // @ts-expect-error the portable subset never reaches Orama's vector search
  mode: "vector",
};

export const hybridProfile: OramaSearchProfile = {
  // @ts-expect-error a profile carries keyword knobs and no hybrid weighting
  hybridWeights: { text: 0.5, vector: 0.5 },
};

export const unknownOrder: OramaSearchSort = {
  sortBy: {
    property: "price",
    // @ts-expect-error Orama orders ascending or descending and nothing else
    order: "ascending",
  },
};

orama({
  db: contractDatabase,
  search,
  // @ts-expect-error a corpus revision has to be a value an identity can carry
  revision: () => ({ version: 1 }),
  profiles: { default: {} },
  sorts: { relevance: {} },
});
