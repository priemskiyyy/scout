import type Fuse from "fuse.js";
import type { FuseResult, FuseResultMatch } from "fuse.js";
import { expectTypeOf } from "vitest";
import { fuse } from "src/fuse";
import type { Product } from "src/fuse.fixture";
import type { FuseHit } from "src/types/FuseHit";
import type { FuseIndex } from "src/types/FuseIndex";
import type { FuseMatch } from "src/types/FuseMatch";

expectTypeOf<Fuse<Product>>().toExtend<FuseIndex<Product>>();
expectTypeOf<FuseResult<Product>>().toExtend<FuseHit<Product>>();
expectTypeOf<FuseResultMatch>().toExtend<FuseMatch>();

declare const engine: Fuse<Product>;
const adapter = fuse({
  index: engine,
  revision: () => 1,
  sorts: { relevance: null },
  profiles: { default: null },
});
expectTypeOf(adapter.sorts).toEqualTypeOf<
  Readonly<Record<"relevance", null>>
>();
expectTypeOf(adapter.profiles).toEqualTypeOf<
  Readonly<Record<"default", null>>
>();
expectTypeOf(adapter.search)
  .parameter(0)
  .toHaveProperty("provider")
  .toEqualTypeOf<null>();
expectTypeOf(adapter.search)
  .returns.resolves.toHaveProperty("hits")
  .items.toHaveProperty("native")
  .toEqualTypeOf<FuseHit<Product>>();

// @ts-expect-error Swapping to Fuse cannot claim a sort it was never configured with.
const missingSort: Readonly<Record<"priceAsc", unknown>> = adapter.sorts;
expectTypeOf(missingSort).toExtend<Readonly<Record<"priceAsc", unknown>>>();

// @ts-expect-error Profiles are checked at adapter configuration, not consumer call sites.
const missingProfile: Readonly<Record<"autocomplete", unknown>> =
  adapter.profiles;
expectTypeOf(missingProfile).toExtend<
  Readonly<Record<"autocomplete", unknown>>
>();

fuse({
  index: engine,
  revision: () => 1,
  profiles: { default: null },
  // @ts-expect-error Ordering belongs to the injected engine's configuration.
  sorts: { relevance: { sortBy: "price" } },
});
