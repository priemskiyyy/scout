import type { Icon } from "@phosphor-icons/react";
import {
  Backpack,
  Bed,
  Boot,
  BracketsCurly,
  CoatHanger,
  CookingPot,
  Cube,
  Database,
  Flashlight,
  Hand,
  HardDrives,
  Leaf,
  Lightning,
  ListMagnifyingGlass,
  PlugsConnected,
  Power,
  Prohibit,
  ShieldWarning,
  Sparkle,
  Stack,
  Tent,
  WarningCircle,
  WifiSlash,
  Wind,
} from "@phosphor-icons/react";

import type { Category } from "examples/shared/outpost/types/Category";
import type { SearchProblemCode } from "examples/shared/outpost/types/SearchProblemCode";
import type { DialectId } from "examples/shared/outpost/types/DialectId";
import type { EngineId } from "examples/shared/outpost/types/EngineId";

export const CATEGORY_ICONS: Record<Category, Icon> = {
  tents: Tent,
  sleeping: Bed,
  packs: Backpack,
  footwear: Boot,
  jackets: CoatHanger,
  cooking: CookingPot,
  lighting: Flashlight,
};

export const ENGINE_ICONS: Record<EngineId, Icon> = {
  api: PlugsConnected,
  orama: Cube,
  minisearch: ListMagnifyingGlass,
  fuse: Sparkle,
};

export const DIALECT_ICONS: Record<DialectId, Icon> = {
  portable: BracketsCurly,
  typesense: Lightning,
  algolia: Stack,
  meilisearch: Wind,
  elasticsearch: Database,
  opensearch: HardDrives,
  mongodb: Leaf,
};

export const PROBLEM_ICONS: Record<SearchProblemCode, Icon> = {
  configuration: WarningCircle,
  "unsupported-feature": Prohibit,
  validation: ShieldWarning,
  provider: WifiSlash,
  aborted: Hand,
  disposed: Power,
  unexpected: WarningCircle,
};
