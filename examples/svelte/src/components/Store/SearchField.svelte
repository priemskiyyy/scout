<script lang="ts">
  import { ICONS } from "examples/shared/ui/constants/icons";
  import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
  import BaseIcon from "src/components/BaseIcon/BaseIcon.svelte";

  type Props = {
    value: string;
    searching: boolean;
    onChange: (value: string) => void;
    onStopPress: () => void;
  };

  let { value, searching, onChange, onStopPress }: Props = $props();
</script>

<div class="relative flex items-center">
  <BaseIcon
    src={ICONS.magnifyingGlass}
    size="large"
    class="pointer-events-none absolute left-3.5 text-stone-400"
  />
  <input
    type="search"
    aria-label="Search the store"
    placeholder="Search tents, boots, stoves…"
    {value}
    oninput={(event) => onChange(event.currentTarget.value)}
    class={[
      "h-12 w-full rounded-xl border border-stone-300 bg-white pr-28 pl-11 text-base shadow-sm outline-none [&::-webkit-search-cancel-button]:hidden",
      "focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-amber-400",
    ]}
  />
  <div class="absolute right-2 flex items-center gap-1">
    {#if searching}
      <button
        type="button"
        onclick={onStopPress}
        class={buttonStyles({ variant: "ghost", size: "small" })}
      >
        <BaseIcon src={ICONS.stop} size="small" />
        Stop
      </button>
    {/if}
    {#if value !== ""}
      <button
        type="button"
        aria-label="Clear the search"
        onclick={() => onChange("")}
        class={buttonStyles({ variant: "ghost", size: "small" })}
      >
        <BaseIcon src={ICONS.x} size="small" />
      </button>
    {/if}
  </div>
</div>
