<script lang="ts">
  import type { StoreAction } from "examples/shared/outpost/types/StoreAction";
  import type { StoreState } from "examples/shared/outpost/types/StoreState";
  import { getActiveFilters } from "examples/shared/outpost/utils/getActiveFilters";
  import { ICONS } from "examples/shared/ui/constants/icons";
  import BaseIcon from "src/components/BaseIcon/BaseIcon.svelte";

  type Props = {
    storeState: StoreState;
    onRemove: (action: StoreAction) => void;
  };

  let { storeState, onRemove }: Props = $props();

  const filters = $derived(getActiveFilters(storeState));
</script>

{#if filters.length > 0}
  <ul aria-label="Active filters" class="flex flex-wrap gap-1.5">
    {#each filters as filter (filter.key)}
      <li>
        <button
          type="button"
          aria-label={`Remove ${filter.label}`}
          onclick={() => onRemove(filter.remove)}
          class="inline-flex items-center gap-1 rounded-full bg-amber-100 py-1 pr-2 pl-3 text-sm font-medium text-amber-900 transition hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900"
        >
          {filter.label}
          <BaseIcon src={ICONS.x} size="xsmall" />
        </button>
      </li>
    {/each}
  </ul>
{/if}
