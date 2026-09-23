<script lang="ts">
  import type { Snippet } from "svelte";
  import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";
  import IconTile from "src/components/IconTile/IconTile.svelte";

  type Props = {
    title: string;
    icon: string;
    shows: string;
    aside?: Snippet;
    children: Snippet;
  };

  let { title, icon, shows, aside, children }: Props = $props();
</script>

<section
  aria-label={title}
  class={["flex h-full min-w-0 flex-col gap-4 p-5", CARD_CLASS_NAME]}
>
  <header class="flex flex-col gap-1.5">
    <div class="flex flex-wrap items-center gap-2">
      <IconTile {icon} size="small" />
      <h3
        class="text-base font-semibold tracking-tight text-stone-800 dark:text-stone-200"
      >
        {title}
      </h3>
      {#if aside !== undefined}
        <div class="ml-auto flex flex-wrap items-center gap-2">
          {@render aside()}
        </div>
      {/if}
    </div>
    <p class="text-sm text-stone-500 dark:text-stone-400">{shows}</p>
  </header>
  {@render children()}
</section>
