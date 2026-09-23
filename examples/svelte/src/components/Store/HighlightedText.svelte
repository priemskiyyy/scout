<script lang="ts">
  import type { HighlightFragment } from "@priemskiyyy/scout";

  type Props = { fragments: readonly HighlightFragment[] | null; text: string };

  let { fragments, text }: Props = $props();

  const fragment = $derived(fragments?.[0]);
</script>

<!-- A part is text, never markup, so a document that carries a tag shows the tag. -->
{#if fragment === undefined}
  {text}
{:else}
  {#each fragment.parts as part, index (index)}
    {#if part.matched}
      <mark
        class="rounded bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-500/30"
        >{part.text}</mark
      >
    {:else}
      {part.text}
    {/if}
  {/each}
{/if}
