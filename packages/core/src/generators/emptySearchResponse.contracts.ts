import { expectTypeOf } from "vitest";
import { emptySearchResponse } from "src/generators/emptySearchResponse";

const request = { page: { current: 1, size: 10 }, facets: [] };
expectTypeOf(emptySearchResponse(request).native).toEqualTypeOf<null>();
// @ts-expect-error An empty response cannot promise a native payload it was never given.
emptySearchResponse<never, string>(request);
