import type { Component } from "solid-js";

import { STATUS_LABELS } from "examples/shared/outpost/constants/labels";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import { ICONS } from "examples/shared/ui/constants/icons";
import { STATUS_TONES } from "examples/shared/ui/constants/tones";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import { dotStyles } from "examples/shared/ui/styles/dotStyles";
import { Badge } from "src/components/Badge/Badge";
import { BaseIcon } from "src/components/BaseIcon/BaseIcon";
import { IconTile } from "src/components/IconTile/IconTile";

type HeaderProps = { status: SearchStatus };

// Nothing outlives the page, so reloading it is a complete reset.
const handleResetPress = () => {
  window.location.reload();
};

export const Header: Component<HeaderProps> = (props) => (
  <header class="sticky top-0 z-20 border-b border-stone-200/70 bg-stone-50/80 backdrop-blur dark:border-stone-800 dark:bg-stone-950/70">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
      <div class="mr-auto flex min-w-0 items-center gap-2">
        <IconTile src={ICONS.compass} size="small" />
        <h1 class="text-lg font-semibold">Outpost</h1>
        <Badge tone={STATUS_TONES[props.status]}>
          <span
            aria-hidden="true"
            class={dotStyles({ tone: STATUS_TONES[props.status] })}
          />
          {STATUS_LABELS[props.status]}
        </Badge>
      </div>
      <button
        type="button"
        onClick={handleResetPress}
        class={buttonStyles({ variant: "ghost", size: "small" })}
      >
        <BaseIcon src={ICONS.arrowCounterClockwise} size="small" />
        Reset demo
      </button>
    </div>
  </header>
);
