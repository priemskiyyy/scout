import type {
  Abortable,
  AggregationCursor,
  Collection,
  Db,
  Document,
} from "mongodb";
import { expectTypeOf } from "vitest";

import type { MongoFakeProduct } from "src/mongodb.fixture";
import type { MongoSearchCollection } from "src/types/MongoSearchCollection";
import type { MongoSearchPipelineStage } from "src/types/MongoSearchPipelineStage";
import type { MongoSearchRow } from "src/types/MongoSearchRow";

/**
 * Pins the structural collection, and the fake that stands in for it, to the
 * real `mongodb` 7.6.0 driver types.
 *
 * The adapter imports no driver, so nothing else would notice if the driver
 * renamed a getter or stopped taking a signal. The driver types every stage
 * as a plain `Document`, so the `$search` stage itself is pinned by MongoDB's
 * documentation and not here. This file is type level only: it compiles, it
 * never runs.
 */

type RealPipeline = Parameters<Collection["aggregate"]>[0];
type RealOptions = Parameters<Collection["aggregate"]>[1];

// An application injects the collection it already has, typed with its own
// schema or not, without annotating it.
expectTypeOf<Collection>().toExtend<MongoSearchCollection>();
expectTypeOf<Collection<MongoFakeProduct>>().toExtend<MongoSearchCollection>();

// The pipeline the adapter writes is one the driver takes.
expectTypeOf<MongoSearchPipelineStage[]>().toExtend<
  NonNullable<RealPipeline>
>();

// The signal is how a search is cancelled on the wire.
expectTypeOf<{ signal: AbortSignal }>().toExtend<NonNullable<RealOptions>>();
expectTypeOf<Abortable["signal"]>().toEqualTypeOf<AbortSignal | undefined>();

// A row is a document, so the cursor holds rows and hands them back as an
// array.
expectTypeOf<MongoSearchRow>().toExtend<Document>();
expectTypeOf<
  ReturnType<AggregationCursor<MongoSearchRow>["toArray"]>
>().toEqualTypeOf<Promise<MongoSearchRow[]>>();

// The fake's documents are documents the driver could have stored.
expectTypeOf<MongoFakeProduct>().toExtend<Document>();

// aggregate answers with a cursor, which sends nothing until it is read, so
// the adapter reads it with toArray. The alias keeps the negative case on one
// line, because the directive suppresses only the line after it.
type RealCursor = ReturnType<Collection["aggregate"]>;
// @ts-expect-error Collection.aggregate returns an AggregationCursor, not a promise.
expectTypeOf<RealCursor>().toExtend<Promise<unknown>>();

// A database also aggregates, but it is not a collection with a search index.
// @ts-expect-error a Db has no collectionName, so it cannot stand in for the collection to search.
expectTypeOf<Db>().toExtend<MongoSearchCollection>();
