<script lang="ts">
  import { formatShown } from "examples/shared/outpost/formatting/formatShown";
  import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
  import { ICONS } from "examples/shared/ui/constants/icons";
  import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
  import BaseIcon from "src/components/BaseIcon/BaseIcon.svelte";

  type Props = {
    shown: number;
    latest: StoreResult;
    loading: boolean;
    onPress: () => void;
  };

  let { shown, latest, loading, onPress }: Props = $props();

  // What the core derived about the next page decides what the list says.
  const getHint = (next: StoreResult["page"]["next"]) => {
    if (next === "unknown") {
      return "The count cannot say whether there is more, so the list asks for another page.";
    }

    if (next === null) {
      return "That is the last page the engine can serve.";
    }

    return null;
  };

  const hint = $derived(getHint(latest.page.next));
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
  {#if latest.page.next !== null}
    <button
      type="button"
      disabled={loading}
      onclick={onPress}
      class={buttonStyles()}
    >
      {#if loading}
        <BaseIcon src={ICONS.circleNotch} size="regular" class="animate-spin" />
      {:else}
        <BaseIcon src={ICONS.arrowDown} size="regular" />
      {/if}
      Load more
    </button>
  {/if}
  <p class="text-sm text-stone-500">
    {formatShown(shown, latest.total)}
    {#if hint !== null}
      <span class="block">{hint}</span>
    {/if}
  </p>
</div>
