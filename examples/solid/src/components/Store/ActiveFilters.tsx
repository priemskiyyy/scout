import { For, Show } from "solid-js";
import type { Component } from "solid-js";

import type { StoreAction } from "examples/shared/outpost/types/StoreAction";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { getActiveFilters } from "examples/shared/outpost/utils/getActiveFilters";
import { ICONS } from "examples/shared/ui/constants/icons";
import { BaseIcon } from "src/components/BaseIcon/BaseIcon";

type ActiveFiltersProps = {
  state: StoreState;
  onRemove: (action: StoreAction) => void;
};

export const ActiveFilters: Component<ActiveFiltersProps> = (props) => {
  const filters = () => getActiveFilters(props.state);

  return (
    <Show when={filters().length > 0}>
      <ul aria-label="Active filters" class="flex flex-wrap gap-1.5">
        <For each={filters()}>
          {(filter) => (
            <li>
              <button
                type="button"
                aria-label={`Remove ${filter.label}`}
                onClick={() => props.onRemove(filter.remove)}
                class="inline-flex items-center gap-1 rounded-full bg-amber-100 py-1 pr-2 pl-3 text-sm font-medium text-amber-900 transition hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900"
              >
                {filter.label}
                <BaseIcon src={ICONS.x} size="xsmall" />
              </button>
            </li>
          )}
        </For>
      </ul>
    </Show>
  );
};
