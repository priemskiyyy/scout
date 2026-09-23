import type Fuse from "fuse.js";
import type { FuseResult, FuseResultMatch } from "fuse.js";
import { expectTypeOf } from "vitest";

import { fuse } from "src/fuse";
import type { Product } from "src/fuse.fixture";
import type { FuseHit } from "src/types/FuseHit";
import type { FuseIndex } from "src/types/FuseIndex";
import type { FuseMatch } from "src/types/FuseMatch";

// The adapter imports no SDK, so this file is where its structural types meet
// the real fuse.js 7.5 ones. It compiles and never runs.
expectTypeOf<Fuse<Product>>().toExtend<FuseIndex<Product>>();
expectTypeOf<FuseResult<Product>>().toExtend<FuseHit<Product>>();
expectTypeOf<FuseResultMatch>().toExtend<FuseMatch>();

// The logical query a narrower profile sends is one Fuse accepts.
expectTypeOf<{ $or: Record<string, string>[] }>().toExtend<
  Parameters<Fuse<Product>["search"]>[0]
>();

declare const engine: Fuse<Product>;

const adapter = fuse({ index: engine, revision: () => 1 });

type Answer = Awaited<ReturnType<typeof adapter.search>>;

// A search takes no provider options, and each hit keeps Fuse's own result.
expectTypeOf(adapter.search)
  .parameter(0)
  .toHaveProperty("provider")
  .toEqualTypeOf<null>();
expectTypeOf<Answer["hits"][number]["native"]>().toEqualTypeOf<
  FuseHit<Product>
>();
expectTypeOf<Answer["native"]>().toEqualTypeOf<readonly FuseHit<Product>[]>();

// Fuse takes the configuration it was built with, never one per search.
// @ts-expect-error the adapter takes no sorts; the index declares them.
fuse({ index: engine, revision: () => 1, sorts: { priceAsc: null } });
