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
  profiles: { forgiving: { tolerance: 2 } },
});

expectTypeOf(contractAdapter.native).toEqualTypeOf<typeof contractDatabase>();

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
expectTypeOf<{ not: { brand: { eq: string } } }>().toExtend<
  WhereCondition<ContractSchema>
>();
expectTypeOf<{
  and: [{ price: { gte: number } }, { inStock: boolean }];
}>().toExtend<WhereCondition<ContractSchema>>();
expectTypeOf<{
  or: [{ brand: { eq: string } }, { brand: { eq: string } }];
}>().toExtend<WhereCondition<ContractSchema>>();

// The facet definition and the sort the adapter emits are Orama's own.
expectTypeOf<Record<"brand", OramaFacetDefinition>>().toExtend<
  FacetsParams<typeof contractDatabase>
>();
expectTypeOf<{ property: string; order: "ASC" | "DESC" }>().toExtend<
  SorterParams<typeof contractDatabase>
>();

// A profile tunes the search and never names the properties, which come from
// the index.
expectTypeOf<OramaSearchProfile>().toExtend<
  Pick<OramaSearchParams, "boost" | "tolerance" | "threshold">
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

export const propertiesProfile: OramaSearchProfile = {
  // @ts-expect-error the properties a profile searches come from the index
  properties: ["name"],
};

orama({
  db: contractDatabase,
  search,
  // @ts-expect-error a corpus revision has to be a value an identity can carry
  revision: () => ({ version: 1 }),
});
