<script lang="ts">
  import type { SearchFacet } from "@priemskiyyy/scout";
  import { formatFacetCount } from "examples/shared/outpost/formatting/formatFacetCount";
  import type { FacetOption } from "examples/shared/outpost/types/FacetOption";
  import { checkStyles } from "examples/shared/ui/styles/checkStyles";
  import { LEGEND_CLASS_NAME } from "examples/shared/ui/styles/legendStyles";

  type Props = {
    title: string;
    facet: SearchFacet<string> | null;
    options: readonly FacetOption[];
    selected: readonly string[];
    onToggle: (value: string) => void;
  };

  let { title, facet, options, selected, onToggle }: Props = $props();
</script>

<fieldset class="flex flex-col gap-0.5">
  <legend class={LEGEND_CLASS_NAME}>{title}</legend>
  {#each options as option (option.value)}
    {@const checked = selected.includes(option.value)}
    {@const count = formatFacetCount(facet, option.value)}
    <label class={checkStyles({ checked })}>
      <input
        type="checkbox"
        {checked}
        onchange={() => onToggle(option.value)}
        class="size-4 accent-amber-600"
      />
      <span class="min-w-0 flex-1 truncate">{option.label}</span>
      {#if count !== null}
        <span class="font-mono text-xs text-stone-500 tabular-nums">
          {count}
        </span>
      {/if}
    </label>
  {/each}
</fieldset>
