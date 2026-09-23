import type { SearchPage } from "@priemskiyyy/scout";

import type { NextPageKind } from "examples/shared/outpost/types/NextPageKind";

export const getNextPageKind = (next: SearchPage["next"]): NextPageKind => {
  if (next === null) {
    return "none";
  }

  if (next === "unknown") {
    return "unknown";
  }

  return "number";
};
