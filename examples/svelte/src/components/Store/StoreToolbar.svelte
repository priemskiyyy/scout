<script lang="ts">
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
  import Badge from "src/components/Badge/Badge.svelte";
  import BaseIcon from "src/components/BaseIcon/BaseIcon.svelte";
  import SegmentedControl from "src/components/SegmentedControl/SegmentedControl.svelte";

  type Props = {
    storeState: StoreState;
    latest: StoreResult | null;
    searching: boolean;
    onProfileSelect: (profile: ProfileName) => void;
    onSortSelect: (sort: SortName) => void;
    onFacetsToggle: () => void;
    onHighlightsToggle: () => void;
  };

  let {
    storeState,
    latest,
    searching,
    onProfileSelect,
    onSortSelect,
    onFacetsToggle,
    onHighlightsToggle,
  }: Props = $props();

  const isSortName = (value: string): value is SortName =>
    SORT_OPTIONS.some((option) => option.value === value);

  const handleSortChange = (value: string) => {
    if (!isSortName(value)) {
      return;
    }

    onSortSelect(value);
  };
</script>

<div class="flex flex-col gap-3">
  <div class="flex flex-wrap items-center gap-2">
    <p aria-live="polite" class="text-lg font-semibold tracking-tight">
      {formatStoreHeadline(latest, searching)}
    </p>
    {#if latest !== null}
      <Badge tone={ACCURACY_TONES[latest.total.accuracy]}>
        {ACCURACY_LABELS[latest.total.accuracy]}
      </Badge>
    {/if}
    <label
      class="ml-auto flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400"
    >
      Sort
      <select
        value={storeState.sort}
        onchange={(event) => handleSortChange(event.currentTarget.value)}
        class={FIELD_CLASS_NAME}
      >
        {#each SORT_OPTIONS as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </label>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <SegmentedControl
      label="Search in"
      options={PROFILE_OPTIONS}
      value={storeState.profile}
      onSelect={onProfileSelect}
    />
    <div class="ml-auto flex flex-wrap gap-2">
      <button
        type="button"
        aria-pressed={storeState.facets}
        onclick={onFacetsToggle}
        class={buttonStyles({ size: "small", pressed: storeState.facets })}
      >
        <BaseIcon src={ICONS.listNumbers} size="small" />
        Facet counts
      </button>
      <button
        type="button"
        aria-pressed={storeState.highlights}
        onclick={onHighlightsToggle}
        class={buttonStyles({ size: "small", pressed: storeState.highlights })}
      >
        <BaseIcon src={ICONS.highlighter} size="small" />
        Highlights
      </button>
    </div>
  </div>
</div>
