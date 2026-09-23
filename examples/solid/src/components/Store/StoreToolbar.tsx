import { For, Show } from "solid-js";
import type { Component } from "solid-js";

import { ACCURACY_LABELS } from "examples/shared/outpost/constants/labels";
import {
  PROFILE_OPTIONS,
  SORT_OPTIONS,
} from "examples/shared/outpost/constants/store";
import { formatStoreHeadline } from "examples/shared/outpost/formatting/formatStoreHeadline";
import type { ProfileName } from "examples/shared/outpost/types/ProfileName";
import type { SortName } from "examples/shared/outpost/types/SortName";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { ICONS } from "examples/shared/ui/constants/icons";
import { ACCURACY_TONES } from "examples/shared/ui/constants/tones";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import { FIELD_CLASS_NAME } from "examples/shared/ui/styles/fieldStyles";
import { Badge } from "src/components/Badge/Badge";
import { BaseIcon } from "src/components/BaseIcon/BaseIcon";
import { SegmentedControl } from "src/components/SegmentedControl/SegmentedControl";

type StoreToolbarProps = {
  state: StoreState;
  latest: StoreResult | null;
  searching: boolean;
  onProfileSelect: (profile: ProfileName) => void;
  onSortSelect: (sort: SortName) => void;
  onFacetsToggle: () => void;
  onHighlightsToggle: () => void;
};

const isSortName = (value: string): value is SortName =>
  SORT_OPTIONS.some((option) => option.value === value);

export const StoreToolbar: Component<StoreToolbarProps> = (props) => {
  const handleSortChange = (value: string) => {
    if (!isSortName(value)) {
      return;
    }

    props.onSortSelect(value);
  };

  return (
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <p aria-live="polite" class="text-lg font-semibold tracking-tight">
          {formatStoreHeadline(props.latest, props.searching)}
        </p>
        <Show when={props.latest}>
          {(latest) => (
            <Badge tone={ACCURACY_TONES[latest().total.accuracy]}>
              {ACCURACY_LABELS[latest().total.accuracy]}
            </Badge>
          )}
        </Show>
        <label class="ml-auto flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
          Sort
          <select
            value={props.state.sort}
            onChange={(event) => handleSortChange(event.currentTarget.value)}
            class={FIELD_CLASS_NAME}
          >
            <For each={SORT_OPTIONS}>
              {(option) => (
                <option
                  value={option.value}
                  selected={option.value === props.state.sort}
                >
                  {option.label}
                </option>
              )}
            </For>
          </select>
        </label>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Search in"
          options={PROFILE_OPTIONS}
          value={props.state.profile}
          onSelect={(profile) => props.onProfileSelect(profile)}
        />
        <div class="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={props.state.facets}
            onClick={() => props.onFacetsToggle()}
            class={buttonStyles({ size: "small", pressed: props.state.facets })}
          >
            <BaseIcon src={ICONS.listNumbers} size="small" />
            Facet counts
          </button>
          <button
            type="button"
            aria-pressed={props.state.highlights}
            onClick={() => props.onHighlightsToggle()}
            class={buttonStyles({
              size: "small",
              pressed: props.state.highlights,
            })}
          >
            <BaseIcon src={ICONS.highlighter} size="small" />
            Highlights
          </button>
        </div>
      </div>
    </div>
  );
};
