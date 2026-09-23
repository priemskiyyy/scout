import arrowClockwise from "@phosphor-icons/core/bold/arrow-clockwise-bold.svg?url";
import arrowCounterClockwise from "@phosphor-icons/core/bold/arrow-counter-clockwise-bold.svg?url";
import arrowDown from "@phosphor-icons/core/bold/arrow-down-bold.svg?url";
import caretRight from "@phosphor-icons/core/bold/caret-right-bold.svg?url";
import circleNotch from "@phosphor-icons/core/bold/circle-notch-bold.svg?url";
import eraser from "@phosphor-icons/core/bold/eraser-bold.svg?url";
import highlighter from "@phosphor-icons/core/bold/highlighter-bold.svg?url";
import listNumbers from "@phosphor-icons/core/bold/list-numbers-bold.svg?url";
import magnifyingGlass from "@phosphor-icons/core/bold/magnifying-glass-bold.svg?url";
import slidersHorizontal from "@phosphor-icons/core/bold/sliders-horizontal-bold.svg?url";
import x from "@phosphor-icons/core/bold/x-bold.svg?url";
import backpack from "@phosphor-icons/core/duotone/backpack-duotone.svg?url";
import bed from "@phosphor-icons/core/duotone/bed-duotone.svg?url";
import binoculars from "@phosphor-icons/core/duotone/binoculars-duotone.svg?url";
import boot from "@phosphor-icons/core/duotone/boot-duotone.svg?url";
import coatHanger from "@phosphor-icons/core/duotone/coat-hanger-duotone.svg?url";
import compass from "@phosphor-icons/core/duotone/compass-duotone.svg?url";
import cookingPot from "@phosphor-icons/core/duotone/cooking-pot-duotone.svg?url";
import cube from "@phosphor-icons/core/duotone/cube-duotone.svg?url";
import flashlight from "@phosphor-icons/core/duotone/flashlight-duotone.svg?url";
import funnel from "@phosphor-icons/core/duotone/funnel-duotone.svg?url";
import hand from "@phosphor-icons/core/duotone/hand-duotone.svg?url";
import lightbulb from "@phosphor-icons/core/duotone/lightbulb-duotone.svg?url";
import listMagnifyingGlass from "@phosphor-icons/core/duotone/list-magnifying-glass-duotone.svg?url";
import plugsConnected from "@phosphor-icons/core/duotone/plugs-connected-duotone.svg?url";
import power from "@phosphor-icons/core/duotone/power-duotone.svg?url";
import prohibit from "@phosphor-icons/core/duotone/prohibit-duotone.svg?url";
import shieldWarning from "@phosphor-icons/core/duotone/shield-warning-duotone.svg?url";
import sparkle from "@phosphor-icons/core/duotone/sparkle-duotone.svg?url";
import tent from "@phosphor-icons/core/duotone/tent-duotone.svg?url";
import warningCircle from "@phosphor-icons/core/duotone/warning-circle-duotone.svg?url";
import wifiSlash from "@phosphor-icons/core/duotone/wifi-slash-duotone.svg?url";
import star from "@phosphor-icons/core/fill/star-fill.svg?url";
import stop from "@phosphor-icons/core/fill/stop-fill.svg?url";

import type { Category } from "examples/shared/outpost/types/Category";
import type { EngineId } from "examples/shared/outpost/types/EngineId";
import type { SearchProblemCode } from "examples/shared/outpost/types/SearchProblemCode";

/** The Phosphor icons the Vue, Solid and Svelte examples draw as CSS masks. */
export const ICONS = {
  arrowClockwise,
  arrowCounterClockwise,
  arrowDown,
  binoculars,
  caretRight,
  circleNotch,
  compass,
  eraser,
  funnel,
  hand,
  highlighter,
  lightbulb,
  listNumbers,
  magnifyingGlass,
  power,
  prohibit,
  shieldWarning,
  slidersHorizontal,
  star,
  stop,
  warningCircle,
  wifiSlash,
  x,
};

export const CATEGORY_ICONS: Record<Category, string> = {
  tents: tent,
  sleeping: bed,
  packs: backpack,
  footwear: boot,
  jackets: coatHanger,
  cooking: cookingPot,
  lighting: flashlight,
};

export const ENGINE_ICONS: Record<EngineId, string> = {
  api: plugsConnected,
  orama: cube,
  minisearch: listMagnifyingGlass,
  fuse: sparkle,
};

export const PROBLEM_ICONS: Record<SearchProblemCode, string> = {
  configuration: warningCircle,
  "unsupported-feature": prohibit,
  validation: shieldWarning,
  provider: wifiSlash,
  aborted: hand,
  disposed: power,
  unexpected: warningCircle,
};
