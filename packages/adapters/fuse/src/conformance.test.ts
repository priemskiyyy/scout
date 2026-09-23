import { testSearchAdapter } from "@priemskiyyy/scout/testing";

import { fuse } from "src/fuse";
import { createProductIndex, productIndex } from "src/fuse.fixture";

// Fuse runs in process, so the suite runs against the real engine over a real
// corpus and checks which documents came back.
testSearchAdapter({
  name: "fuse",
  index: productIndex,
  createAdapter: () =>
    fuse({ index: createProductIndex(), revision: () => "fixture" }),
  evaluates: true,
  fixtures: {
    query: "shoe",
    equality: { field: "category", value: "footwear" },
    range: { field: "price", min: 10, max: 150 },
  },
});
